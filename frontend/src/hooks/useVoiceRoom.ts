import { useState, useRef, useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import api, { getAccessToken } from '../lib/axios';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Mỗi đoạn thu âm dài 15 giây rồi gửi lên backend để chuyển thành text.
const RECORDING_SEGMENT_MS = 15_000;
// Bỏ qua blob quá nhỏ (im lặng/nhiễu) để tránh gọi Groq vô ích.
const MIN_AUDIO_BLOB_BYTES = 1_500;

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
  leaveVoice: () => void;
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
    isRecordingRef.current = true;
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      mediaRecorderRef.current = null;
      if (segmentTimerRef.current) {
        clearTimeout(segmentTimerRef.current);
        segmentTimerRef.current = null;
      }

      const shouldSend =
        isRecordingRef.current && !discardCurrentSegmentRef.current;
      discardCurrentSegmentRef.current = false;

      if (shouldSend && chunks.length > 0) {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm',
        });
        void sendAudioChunk(blob);
      }

      // Thu tiếp đoạn kế tiếp nếu phiên voice vẫn đang hoạt động.
      if (isRecordingRef.current) {
        startRecordingRef.current();
      }
    };

    recorder.start();

    segmentTimerRef.current = setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, RECORDING_SEGMENT_MS);
  }, [sendAudioChunk]);

  startRecordingRef.current = startRecording;

  /**
   * Dừng thu âm (khi mute, leave hoặc mất kết nối).
   * Đoạn audio dở dang bị bỏ, không gửi lên server.
   */
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;

    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      discardCurrentSegmentRef.current = true;
      recorder.stop();
    } else {
      mediaRecorderRef.current = null;
    }
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
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    const socket = socketRef.current;

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

    socket.on('disconnect', () => {
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

      if (stateRef.current === 'connected' || stateRef.current === 'connecting') {
        // Unexpected disconnect (mất mạng, server sập)
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();
        setPeers([]);
        setError('Mất kết nối tới server. Vui lòng tham gia lại.');
        setState('error');
        setIsMuted(false);
        socketRef.current = null;
      }
    });
  }, [
    roomId,
    createPeerConnection,
    cleanupPeer,
    flushPendingIce,
  ]);

  const leaveVoice = useCallback(() => {
    console.log('[voice-debug] leaveVoice called');
    isUserInitiatedLeave.current = true;

    // Dừng thu âm STT trước khi tắt micro
    stopRecording();

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('voice:leave', { roomId });
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
    const peerConnections = peerConnectionsRef.current;
    const socket = socketRef.current;
    const localStream = localStreamRef.current;

    return () => {
      stopRecording();
      if (stateRef.current === 'connected' || stateRef.current === 'connecting') {
        localStream?.getTracks()?.forEach((track) => track.stop());
        peerConnections.forEach((pc) => pc.close());
        if (socket) {
          socket.disconnect();
        }
        setPeers([]);
        setError(null);
        setState('idle');
        setIsMuted(false);
      }
    };
  }, [stopRecording]);

  return { state, peers, error, isMuted, join, leaveVoice, toggleMute };
}
