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
  audioStream?: MediaStream;
  muted: boolean;
  iceState: string;
}

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
      const pc = new RTCPeerConnection(ICE_SERVERS);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('voice:ice', {
            roomId,
            toUserId: peerUserId,
            candidate: event.candidate,
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
    setPeers((prev) => prev.filter((p) => p.userId !== peerUserId));
  }, []);

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
    const newMuted = !audioTrack.enabled;
    audioTrack.enabled = !newMuted;
    setIsMuted(newMuted);

    // Tắt mic -> ngừng thu âm; bật lại -> thu tiếp.
    if (newMuted) {
      stopRecording();
    } else {
      startRecording();
    }

    socketRef.current?.emit('voice:mute', { roomId, muted: newMuted });
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
      (members: { userId: string; muted: boolean }[]) => {
        setState('connected');

        members.forEach(({ userId: peerUserId, muted }) => {
          setPeers((prev) => {
            if (prev.some((p) => p.userId === peerUserId)) return prev;
            return [
              ...prev,
              { userId: peerUserId, muted, iceState: 'connecting' },
            ];
          });
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
            });
        });
      }
    );

    socket.on(
      'voice:peer-joined',
      ({ userId: peerUserId }: { userId: string }) => {
        setState('connected');
        setPeers((prev) => {
          if (prev.some((p) => p.userId === peerUserId)) return prev;
          return [
            ...prev,
            { userId: peerUserId, muted: false, iceState: 'connecting' },
          ];
        });
      }
    );

    socket.on(
      'voice:offer',
      async ({ fromUserId, sdp }: { fromUserId: string; sdp: string }) => {
        let pc = peerConnectionsRef.current.get(fromUserId);
        if (!pc) {
          pc = createPeerConnection(fromUserId);
        }
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: 'offer', sdp })
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:answer', {
          roomId,
          toUserId: fromUserId,
          sdp: answer.sdp!,
        });
      }
    );

    socket.on(
      'voice:answer',
      ({ fromUserId, sdp }: { fromUserId: string; sdp: string }) => {
        const pc = peerConnectionsRef.current.get(fromUserId);
        if (pc) {
          pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp })
          );
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
        if (pc) {
          pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
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
        localStream?.getTracks().forEach((track) => track.stop());
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
