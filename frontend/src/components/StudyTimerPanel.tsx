import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { getCurrentSessionApi, startSessionApi, pauseSessionApi, resumeSessionApi, finishSessionApi, StudySessionData } from '../api/studySession.api';

interface Props {
  roomId: string;
  socket: Socket | null;
}

const StudyTimerPanel = ({ roomId, socket }: Props) => {
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [otherSessions, setOtherSessions] = useState<Record<string, StudySessionData>>({});

  // 1. Lấy phiên học hiện tại của mình
  const { data: currentSession, isLoading } = useQuery({
    queryKey: ['currentSession', roomId],
    queryFn: () => getCurrentSessionApi(roomId),
    enabled: !!roomId,
  });

  // 2. Chạy đồng hồ đếm giây
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentSession?.status === 'ACTIVE') {
      // Tính thời gian đã trôi qua từ lúc bắt đầu
      const baseDuration = currentSession.duration;
      const startTime = new Date(currentSession.startedAt).getTime();
      
      interval = setInterval(() => {
        const now = new Date().getTime();
        const currentSessionElapsed = Math.floor((now - startTime) / 1000);
        setElapsed(baseDuration + currentSessionElapsed);
      }, 1000);
    } else {
      setElapsed(currentSession?.duration || 0);
    }
    return () => clearInterval(interval);
  }, [currentSession]);

  // 3. Các hàm Mutation gọi API
  const startMutation = useMutation({
    mutationFn: () => startSessionApi(roomId, goal),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentSession', roomId], data);
      socket?.emit('study:status_update', { roomId, session: data });
    }
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseSessionApi(roomId, currentSession!.id),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentSession', roomId], data);
      socket?.emit('study:status_update', { roomId, session: data });
    }
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumeSessionApi(roomId, currentSession!.id),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentSession', roomId], data);
      socket?.emit('study:status_update', { roomId, session: data });
    }
  });

  const finishMutation = useMutation({
    mutationFn: () => finishSessionApi(roomId, currentSession!.id),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentSession', roomId], null);
      socket?.emit('study:status_update', { roomId, session: data });
    }
  });

  // 4. Lắng nghe cập nhật từ người khác qua Socket
  useEffect(() => {
    if (!socket) return;
    const handleUserStatus = (session: StudySessionData) => {
      setOtherSessions(prev => {
        const newState = { ...prev };
        if (session.status === 'COMPLETED') {
          delete newState[session.userId];
        } else {
          newState[session.userId] = session;
        }
        return newState;
      });
    };
    socket.on('study:user_status', handleUserStatus);
    return () => { socket.off('study:user_status', handleUserStatus); };
  }, [socket]);

  // Format thời gian hiển thị (mm:ss)
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isLoading) return <div>Đang tải...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
      <h2 className="text-xl font-bold mb-4">Phiên học của bạn</h2>

      {!currentSession || currentSession.status === 'COMPLETED' ? (
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Mục tiêu hôm nay (VD: Học chương 1)..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full border p-2 rounded focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="w-full bg-green-500 text-white font-bold py-2 rounded hover:bg-green-600"
          >
            {startMutation.isPending ? 'Đang bắt đầu...' : '🚀 Bắt đầu tập trung'}
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className={`text-5xl font-mono font-bold ${currentSession.status === 'ACTIVE' ? 'text-blue-600' : 'text-orange-500'}`}>
            {formatTime(elapsed)}
          </div>
          <p className="text-gray-600 italic">Mục tiêu: {currentSession.goal || 'Không có'}</p>
          
          <div className="flex gap-2 justify-center">
            {currentSession.status === 'ACTIVE' ? (
              <button onClick={() => pauseMutation.mutate()} className="bg-orange-500 text-white px-6 py-2 rounded">Tạm dừng (Break)</button>
            ) : (
              <button onClick={() => resumeMutation.mutate()} className="bg-blue-500 text-white px-6 py-2 rounded">Tiếp tục (Focus)</button>
            )}
            <button onClick={() => finishMutation.mutate()} className="bg-red-500 text-white px-6 py-2 rounded">Kết thúc</button>
          </div>
        </div>
      )}

      {/* Hiển thị trạng thái của người khác trong phòng */}
      {Object.values(otherSessions).length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Mọi người đang học:</h3>
          {Object.values(otherSessions).map((s) => (
            <div key={s.id} className="flex justify-between items-center text-sm mb-1">
              <span>{s.goal || 'Đang tập trung'}</span>
              <span className={`font-bold ${s.status === 'ACTIVE' ? 'text-green-500' : 'text-orange-500'}`}>
                {s.status === 'ACTIVE' ? 'Focus' : 'Break'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyTimerPanel;