import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';

// Cấu hình STUN Server (Giúp tìm đường đi giữa 2 máy tính qua NAT)
const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const useWebRTC = (socket: Socket | null, roomId: string | undefined) => {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Hàm tạo kết nối Peer-to-Peer với một người khác
  const createPeerConnection = useCallback((targetId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // 1. Gửi ICE Candidate của mình cho đối phương
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('voice:ice_candidate', { targetId, candidate: event.candidate });
      }
    };

    // 2. Nhận âm thanh (Track) từ đối phương
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(targetId, event.streams[0]);
        return newMap;
      });
    };

    // 3. Thêm Micro của mình vào kết nối
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peersRef.current.set(targetId, pc);
    return pc;
  }, [socket]);

  // Hàm bật Voice (Xin quyền Micro)
  const joinVoice = async () => {
    try {
      // Xin quyền micro
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsInVoice(true);
      setIsMuted(false);

      // Báo cho Server biết mình đã vào phòng voice
      socket?.emit('voice:join', roomId);
    } catch (error) {
      alert('Không thể truy cập Microphone. Vui lòng cấp quyền!');
      console.error(error);
    }
  };

  // Hàm rời Voice và dọn dẹp
  const leaveVoice = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setRemoteStreams(new Map());
    setIsInVoice(false);
    socket?.emit('voice:leave', roomId);
  };

  // Hàm Mute / Unmute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Lắng nghe các sự kiện từ Socket
  useEffect(() => {
    if (!socket) return;

    // Có người mới vào voice -> Mình chủ động gửi Offer cho họ
    const handleUserJoined = async (targetId: string) => {
      const pc = createPeerConnection(targetId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice:offer', { targetId, offer });
    };

    // Nhận Offer từ người khác -> Tạo Answer trả lại
    const handleOffer = async ({ fromId, offer }: { fromId: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(fromId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice:answer', { targetId: fromId, answer });
    };

    // Nhận Answer
    const handleAnswer = async ({ fromId, answer }: { fromId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(fromId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // Nhận ICE Candidate
    const handleIceCandidate = async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(fromId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    // Có người rời đi -> Dọn dẹp
    const handleUserLeft = (targetId: string) => {
      const pc = peersRef.current.get(targetId);
      if (pc) {
        pc.close();
        peersRef.current.delete(targetId);
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.delete(targetId);
          return newMap;
        });
      }
    };

    socket.on('voice:user_joined', handleUserJoined);
    socket.on('voice:offer', handleOffer);
    socket.on('voice:answer', handleAnswer);
    socket.on('voice:ice_candidate', handleIceCandidate);
    socket.on('voice:user_left', handleUserLeft);

    return () => {
      socket.off('voice:user_joined', handleUserJoined);
      socket.off('voice:offer', handleOffer);
      socket.off('voice:answer', handleAnswer);
      socket.off('voice:ice_candidate', handleIceCandidate);
      socket.off('voice:user_left', handleUserLeft);
    };
  }, [socket, createPeerConnection]);

  return { isInVoice, isMuted, remoteStreams, joinVoice, leaveVoice, toggleMute };
};