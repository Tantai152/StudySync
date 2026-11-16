import { useState, useRef, useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import api, { getAccessToken } from '../lib/axios';
import { installAuthRecovery } from '../lib/socket';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Mỗi đoạn thu âm dài 15 giây rồi gửi lên backend để chuyển thành text.
const RECORDING_SEGMENT_MS = 15_000;
// Bỏ qua blob quá nhỏ (im lặng/nhiễu) để tránh gọi Groq vô ích.
const MIN_AUDIO_BLOB_BYTES = 1_500;

// Whisper "ảo giác" ra câu YouTube tiếng Việt khi đoạn audio gần như im lặng.
// Ngưỡng byte không bắt được im lặng (15s opus im lặng vẫn ~10-20KB) nên phải
// đo năng lượng tín hiệu thật từ micro.
const SPEECH_RMS_THRESHOLD = 0.01;
const SPEECH_SAMPLE_MS = 100;
const MIN_SPEECH_MS_PER_SEGMENT = 300;

interface SpeechMeter {
  /** True khi đo được tín hiệu thật; false khi AudioContext bị chặn => bỏ lọc. */
  available: () => boolean;
  stop: () => void;
}

const startSpeechMeter = (
  stream: MediaStream,
  onSpeechMs: (deltaMs: number) => void
): SpeechMeter => {
  if (typeof AudioContext === 'undefined') {
    return { available: () => false, stop: () => {} };
  }

  try {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let blocked = false;

    void context.resume();

    const timer = window.setInterval(() => {
      // Autoplay policy có thể giữ context ở 'suspended' => mọi sample bằng 0.
      // Khi đó không được coi là "im lặng", nếu không sẽ chặn sạch audio.
      if (context.state !== 'running') {
        blocked = true;
        return;
      }
      analyser.getFloatTimeDomainData(samples);
      let sumSquares = 0;
      for (let i = 0; i < samples.length; i += 1) {
        sumSquares += samples[i] * samples[i];
      }
      if (Math.sqrt(sumSquares / samples.length) >= SPEECH_RMS_THRESHOLD) {
        onSpeechMs(SPEECH_SAMPLE_MS);
      }
    }, SPEECH_SAMPLE_MS);

    return {
      available: () => !blocked,
      stop: () => {
        window.clearInterval(timer);
        source.disconnect();
        void context.close();
      },
    };
  } catch {
    return { available: () => false, stop: () => {} };
  }
};

const RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
];

const pickRecordingMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return RECORDING_MIME_TYPES.find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
};

type VoiceState = 'idle' | 'requesting-mic' | 'connecting' | 'connected' | 'error';

interface PeerInfo {
  userId: string;
  name?: string;
  email?: string;
  audioStream?: MediaStream;
  muted: boolean;
  iceState: string;
}

interface RosterMember {
  userId: string;
  socketId?: string;
  name?: string;
  email?: string;
  muted: boolean;
}

/** Backend gửi `{ members: [...] }`; chấp nhận cả array trần để chống lệch shape. */
const normalizeRoster = (
  payload: RosterMember[] | { members?: RosterMember[] } | null | undefined
): RosterMember[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.members)) return payload.members;
  return [];
};

interface UseVoiceRoomReturn {
  state: VoiceState;
  peers: PeerInfo[];
  error: string | null;
  isMuted: boolean;
  join: () => Promise<void>;
  leaveVoice: () => Promise<void>;
  toggleMute: () => void;
}

export function useVoiceRoom({ roomId }: { roomId: string }): UseVoiceRoomReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // ICE đến trước remoteDescription sẽ lỗi => xếp hàng chờ.
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const stateRef = useRef<VoiceState>('idle');
  const isUserInitiatedLeave = useRef(false);

  // Speech-to-text (MediaRecorder) state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);
  const isMutedRef = useRef(false);
  const discardCurrentSegmentRef = useRef(false);
  const startRecordingRef = useRef<() => void>(() => {});
  // Promise của lần upload gần nhất (dùng để await chunk cuối khi rời phòng).
  const lastUploadPromiseRef = useRef<Promise<void> | null>(null);
  // Resolver cho stopRecording: được gọi khi onstop của recorder chạy xong.
  const stopResolveRef = useRef<(() => void) | null>(null);

  stateRef.current = state;
  isMutedRef.current = isMuted;

  const createPeerConnection = useCallback(
    (peerUserId: string): RTCPeerConnection => {
      // Tái sử dụng connection đã có, tránh tạo trùng khi roster tới nhiều lần.
      const existing = peerConnectionsRef.current.get(peerUserId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE_SERVERS);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('voice:ice', {
            roomId,
            toUserId: peerUserId,
            // Gửi dạng plain object; backend schema trước đây chỉ nhận string
            // nên mọi candidate đều bị drop.
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        setPeers((prev) => {
          const existing = prev.find((p) => p.userId === peerUserId);
          if (existing && existing.audioStream === event.streams[0]) return prev;
          const next = [...prev];
          const idx = next.findIndex((p) => p.userId === peerUserId);
          if (idx >= 0) {
            next[idx] = { ...next[idx], audioStream: event.streams[0] };
          } else {
            next.push({
              userId: peerUserId,
              audioStream: event.streams[0],
              muted: false,
              iceState: 'connecting',
            });
          }
          return next;
        });
      };

      pc.oniceconnectionstatechange = () => {
        setPeers((prev) =>
          prev.map((p) =>
            p.userId === peerUserId
              ? { ...p, iceState: pc.iceConnectionState }
              : p
          )
        );
        if (pc.iceConnectionState === 'failed') {
          console.warn(
            '[voice] ICE failed — cần TURN server cho production'
          );
        }
      };

      peerConnectionsRef.current.set(peerUserId, pc);
      return pc;
    },
    [roomId]
  );

  const cleanupPeer = useCallback((peerUserId: string) => {
    const pc = peerConnectionsRef.current.get(peerUserId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerUserId);
    }
    pendingIceRef.current.delete(peerUserId);
    setPeers((prev) => prev.filter((p) => p.userId !== peerUserId));
  }, []);

  /** Thêm các ICE đã xếp hàng sau khi remoteDescription đã sẵn sàng. */
  const flushPendingIce = useCallback(
    async (peerUserId: string, pc: RTCPeerConnection) => {
      const queued = pendingIceRef.current.get(peerUserId);
      if (!queued?.length) return;
      pendingIceRef.current.delete(peerUserId);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[voice] addIceCandidate (queued) lỗi', err);
        }
      }
    },
    []
  );

  /**
   * Gửi 1 đoạn audio lên backend để Groq Whisper chuyển thành text.
   * Lỗi STT được nuốt (chỉ warn) để không làm gián đoạn cuộc gọi thoại.
   */
  const sendAudioChunk = useCallback(
    async (blob: Blob) => {
      if (blob.size < MIN_AUDIO_BLOB_BYTES) return;

      try {
        const formData = new FormData();
        formData.append('audio', blob, `chunk-${Date.now()}.webm`);

        await api.post(`/rooms/${roomId}/transcribe`, formData, {
          // `false` xoá Content-Type mặc định (application/json) để trình duyệt
          // tự set multipart/form-data kèm boundary cho FormData.
          headers: { 'Content-Type': false },
        });
      } catch (err) {
        console.warn('[voice] Không gửi được đoạn audio để transcribe', err);
      }
    },
    [roomId]
  );

  /**
   * Bắt đầu thu âm thanh từ local stream.
   * Mỗi 15 giây recorder dừng lại, blob hoàn chỉnh được gửi đi, rồi thu tiếp.
   */
  const startRecording = useCallback(() => {
    const stream = localStreamRef.current;
    if (
      !stream ||
      isRecordingRef.current ||
      stateRef.current !== 'connected' ||
      isMutedRef.current ||
      typeof MediaRecorder === 'undefined'
    ) {
      return;
    }

    const mimeType = pickRecordingMimeType();
    let recorder: MediaRecorder;

    try {
      recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
    } catch (err) {
      console.warn('[voice] Không thể khởi tạo MediaRecorder', err);
      return;
    }

    const chunks: BlobPart[] = [];
    let speechMs = 0;
    const meter = startSpeechMeter(stream, (deltaMs) => {
      speechMs += deltaMs;
    });
    isRecordingRef.current = true;
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      mediaRecorderRef.current = null;
      meter.stop();
      if (segmentTimerRef.current) {
        clearTimeout(segmentTimerRef.current);
        segmentTimerRef.current = null;
      }

      const blob =
        chunks.length > 0
          ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          : null;
      // Blob đã copy dữ liệu; xoá mảng ngay để không giữ audio đoạn này.
      chunks.length = 0;

      // Gửi đoạn audio vừa thu (kể cả đoạn cuối khi rời phòng).
      // Bỏ khi bị đánh dấu discard, hoặc khi đoạn đó không có tiếng nói.
      const hasSpeech =
        !meter.available() || speechMs >= MIN_SPEECH_MS_PER_SEGMENT;
      const shouldSend =
        !discardCurrentSegmentRef.current && blob !== null && hasSpeech;
      discardCurrentSegmentRef.current = false;

      let uploadPromise: Promise<void> = Promise.resolve();
      if (shouldSend && blob) {
        uploadPromise = sendAudioChunk(blob);
        lastUploadPromiseRef.current = uploadPromise;
      }

      // Nếu stopRecording() đang chờ, giải phóng nó sau khi upload hoàn tất.
      if (stopResolveRef.current) {
        const resolveStop = stopResolveRef.current;
        stopResolveRef.current = null;
        uploadPromise.then(resolveStop, resolveStop);
      }

      // Thu tiếp đoạn kế tiếp chỉ khi vẫn còn trong phiên ghi âm.
      if (isRecordingRef.current) {
        startRecordingRef.current();
      }
    };

    try {
      recorder.start();
    } catch (err) {
      meter.stop();
      isRecordingRef.current = false;
      mediaRecorderRef.current = null;
      console.warn('[voice] Không thể bắt đầu MediaRecorder', err);
      return;
    }

    segmentTimerRef.current = setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, RECORDING_SEGMENT_MS);
  }, [sendAudioChunk]);

  startRecordingRef.current = startRecording;

  /**
   * Dừng thu âm (khi mute, leave hoặc mất kết nối).
   * Trả về Promise resolve sau khi đoạn audio cuối được gửi xong (hoặc ngay
   * nếu không còn gì để gửi) — để leaveVoice() chờ trước khi ngắt socket.
   */
  const stopRecording = useCallback((): Promise<void> => {
    isRecordingRef.current = false;

    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      mediaRecorderRef.current = null;
      return lastUploadPromiseRef.current ?? Promise.resolve();
    }

    // Giữ lại đoạn audio cuối: không set discardCurrentSegmentRef = true.
    return new Promise<void>((resolve) => {
      stopResolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  // Tự động thu âm khi đã vào phòng voice, dừng khi rời/mất kết nối.
  useEffect(() => {
    if (state === 'connected') {
      startRecording();
    } else {
      stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  const toggleMute = useCallback(() => {
    if (stateRef.current !== 'connected') return;
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    // `muted` = mic tắt. track.enabled = true nghĩa là đang phát âm.
    // Đang bật (enabled) => lần bấm này sẽ mute => nextMuted = true.
    const nextMuted = audioTrack.enabled;
    audioTrack.enabled = !nextMuted;
    setIsMuted(nextMuted);

    // Tắt mic -> ngừng thu âm; bật lại -> thu tiếp.
    if (nextMuted) {
      stopRecording();
    } else {
      startRecording();
    }

    socketRef.current?.emit('voice:mute', { roomId, muted: nextMuted });
  }, [roomId, startRecording, stopRecording]);

  const join = useCallback(async () => {
    console.log('[voice-debug] join called');
    setError(null);
    setState('requesting-mic');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
    } catch (err) {
      const errorName = err instanceof Error ? err.name : String(err);
      let msg = 'Không thể truy cập micro. Vui lòng thử lại.';
      if (errorName === 'NotAllowedError') {
        msg =
          'Trình duyệt chặn micro. Bấm biểu tượng ổ khóa trên thanh địa chỉ để cấp quyền.';
      } else if (errorName === 'NotFoundError') {
        msg = 'Không tìm thấy micro trên thiết bị.';
      } else if (errorName === 'NotReadableError') {
        msg = 'Micro đang bị ứng dụng khác sử dụng.';
      }
      setError(msg);
      setState('error');
      return;
    }

    setState('connecting');

    const token = getAccessToken();
    if (!token) {
      setError('Chưa đăng nhập. Vui lòng đăng nhập lại.');
      setState('error');
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    socketRef.current = io(`${socketUrl}/voice`, {
      // Callback chạy lại mỗi lần thử kết nối => luôn gửi token mới nhất.
      auth: (cb) => cb({ token: getAccessToken() ?? '' }),
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 20_000,
    });

    const socket = socketRef.current;

    // Refresh token khi backend từ chối vì JWT hết hạn; nếu refresh token cũng
    // chết thì dừng mic/peer trước khi bị đá về /login.
    installAuthRecovery(socket, () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      pendingIceRef.current.clear();
      setPeers([]);
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      setState('error');
    });

    socket.on('connect', () => {
      socket.emit('voice:join', { roomId });
    });

    socket.on('voice:error', (_data: { code: string; message: string }) => {
      setError(_data.message);
      setState('error');
    });

    socket.on(
      'voice:roster',
      (payload: RosterMember[] | { members?: RosterMember[] } | null) => {
        setState('connected');

        const memberList = normalizeRoster(payload);
        memberList.forEach((member) => {
          const { userId: peerUserId, muted } = member;
          if (!peerUserId) return; // bỏ qua entry hỏng thay vì tạo peer "??"
          setPeers((prev) => {
            if (prev.some((p) => p.userId === peerUserId)) return prev;
            return [
              ...prev,
              {
                userId: peerUserId,
                name: member.name,
                email: member.email,
                muted,
                iceState: 'connecting',
              },
            ];
          });
          // Nếu đã có connection (roster lặp) thì không tạo offer lần nữa.
          if (peerConnectionsRef.current.has(peerUserId)) return;
          const pc = createPeerConnection(peerUserId);
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              const sdp = pc.localDescription?.sdp;
              if (sdp) {
                socket.emit('voice:offer', {
                  roomId,
                  toUserId: peerUserId,
                  sdp,
                });
              }
            })
            .catch((err) => {
              console.error('[voice] createOffer lỗi', err);
            });
        });
      }
    );

    socket.on(
      'voice:peer-joined',
      ({
        userId: peerUserId,
        name,
        email,
      }: {
        userId: string;
        name?: string;
        email?: string;
      }) => {
        if (!peerUserId) return;
        setState('connected');
        setPeers((prev) => {
          if (prev.some((p) => p.userId === peerUserId)) return prev;
          return [
            ...prev,
            {
              userId: peerUserId,
              name,
              email,
              muted: false,
              iceState: 'connecting',
            },
          ];
        });
        // Peer mới sẽ gửi offer cho mình; không tạo offer ở đây để tránh glare.
      }
    );

    socket.on(
      'voice:offer',
      async ({ fromUserId, sdp }: { fromUserId: string; sdp: string }) => {
        console.log('[voice] Received Offer', { fromUserId });
        try {
          let pc = peerConnectionsRef.current.get(fromUserId);
          if (!pc) {
            pc = createPeerConnection(fromUserId);
          }
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'offer', sdp })
          );
          await flushPendingIce(fromUserId, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:answer', {
            roomId,
            toUserId: fromUserId,
            sdp: answer.sdp!,
          });
        } catch (err) {
          console.error('[voice] xử lý offer lỗi', err);
        }
      }
    );

    socket.on(
      'voice:answer',
      async ({ fromUserId, sdp }: { fromUserId: string; sdp: string }) => {
        console.log('[voice] Received Answer', { fromUserId });
        const pc = peerConnectionsRef.current.get(fromUserId);
        if (!pc) return;
        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp })
          );
          await flushPendingIce(fromUserId, pc);
        } catch (err) {
          console.error('[voice] xử lý answer lỗi', err);
        }
      }
    );

    socket.on(
      'voice:ice',
      ({
        fromUserId,
        candidate,
      }: {
        fromUserId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const pc = peerConnectionsRef.current.get(fromUserId);
        // Chưa có pc hoặc chưa có remoteDescription => xếp hàng.
        if (!pc || !pc.remoteDescription) {
          const queue = pendingIceRef.current.get(fromUserId) ?? [];
          queue.push(candidate);
          pendingIceRef.current.set(fromUserId, queue);
          return;
        }
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.warn('[voice] addIceCandidate lỗi', err);
        });
      }
    );

    socket.on(
      'voice:peer-left',
      ({ userId: peerUserId }: { userId: string }) => {
        cleanupPeer(peerUserId);
      }
    );

    socket.on(
      'voice:peer-muted',
      ({
        userId: peerUserId,
        muted,
      }: {
        userId: string;
        muted: boolean;
      }) => {
        setPeers((prev) =>
          prev.map((p) =>
            p.userId === peerUserId ? { ...p, muted } : p
          )
        );
      }
    );

    socket.on('disconnect', (reason: string) => {
      if (isUserInitiatedLeave.current) {
        // User intentionally left — clean up silently
        isUserInitiatedLeave.current = false;
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();
        setPeers([]);
        setError(null);
        setState('idle');
        setIsMuted(false);
        socketRef.current = null;
        return;
      }

      if (reason === 'io server disconnect') {
        // Server chủ động ngắt (restart/redeploy): client không tự reconnect.
        socket.connect();
      }

      // Mất mạng / server cold start: Socket.IO sẽ tự kết nối lại. Dọn peer cũ
      // nhưng GIỮ socket + mic để 'connect' join lại phòng, tránh rò rỉ và
      // tránh nhầm thành lỗi "mất kết nối" vĩnh viễn.
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      pendingIceRef.current.clear();
      setPeers([]);
      setIsMuted(false);
      setState('connecting');
    });
  }, [
    roomId,
    createPeerConnection,
    cleanupPeer,
    flushPendingIce,
  ]);

  const leaveVoice = useCallback(async () => {
    console.log('[voice-debug] leaveVoice called');
    isUserInitiatedLeave.current = true;

    // Dừng thu âm STT và chờ đoạn audio cuối được gửi xong (tối đa 3s).
    // Việc này giữ stream sống để MediaRecorder kịp flush dữ liệu cuối,
    // đồng thời tránh backend đếm giờ summary khi upload còn đang bay.
    try {
      await Promise.race([
        stopRecording(),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch (err) {
      console.warn('[voice] Lỗi khi chờ gửi đoạn audio cuối', err);
    }

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('voice:leave', { roomId });
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setPeers([]);
    setError(null);
    setState('idle');
    setIsMuted(false);
    isUserInitiatedLeave.current = false;
  }, [roomId, stopRecording]);

  // Cleanup on tab close / beforeunload — chỉ dọn dẹp local, không emit leave
  const handleUnload = useCallback(() => {
    stopRecording();
    if (stateRef.current === 'connected' || stateRef.current === 'connecting') {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [stopRecording]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [handleUnload]);

  // Cleanup on component unmount
  useEffect(() => {
    // Hai Map dưới đây chỉ bị mutate, không bao giờ gán lại => giữ nguyên instance.
    const peerConnections = peerConnectionsRef.current;
    const pendingIce = pendingIceRef.current;

    return () => {
      stopRecording();
      // Đọc ref tại thời điểm unmount (không capture lúc mount): socket/stream
      // được tạo sau đó trong join(), capture sớm sẽ bỏ sót và gây rò rỉ.
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      peerConnections.forEach((pc) => pc.close());
      peerConnections.clear();
      pendingIce.clear();
      const socket = socketRef.current;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [stopRecording]);

  return { state, peers, error, isMuted, join, leaveVoice, toggleMute };
}
