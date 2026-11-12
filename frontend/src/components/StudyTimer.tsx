import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import {
  getCurrentSessionApi,
  startSessionApi,
  pauseSessionApi,
  resumeSessionApi,
  finishSessionApi,
  type StudySessionDTO,
} from '../api/room.api';

interface StudyTimerProps {
  roomId: string;
  socket: Socket | null;
}

const computeElapsed = (session: StudySessionDTO | null): number => {
  if (!session) return 0;
  let base = session.duration ?? 0;
  if (session.status === 'ACTIVE' && session.lastResumedAt) {
    base += Math.floor((Date.now() - Date.parse(session.lastResumedAt)) / 1000);
  }
  return base;
};

const formatTime = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- COMPONENT MỚI: Để đếm giây cho người khác ---
const OtherUserTimer = ({ session }: { session: StudySessionDTO }) => {
  const [elapsed, setElapsed] = useState(computeElapsed(session));

  useEffect(() => {
    setElapsed(computeElapsed(session)); // Cập nhật lại base time khi có data mới
    if (session.status !== 'ACTIVE') return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  return (
    <div className="flex items-center justify-between bg-white border p-2 rounded-lg shadow-sm">
      <div className="flex flex-col overflow-hidden">
        <span className="text-xs text-gray-700 truncate max-w-[120px]">
          {session.goal || 'Không có mục tiêu'}
        </span>
        <span className="text-sm font-bold text-gray-800 font-mono">
          {formatTime(elapsed)}
        </span>
      </div>
      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${session.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {session.status === 'ACTIVE' ? 'Focus' : 'Break'}
      </span>
    </div>
  );
};

const StudyTimer = ({ roomId, socket }: StudyTimerProps) => {
  const queryClient = useQueryClient();
  const [goalInput, setGoalInput] = useState('');
  const [otherSessions, setOtherSessions] = useState<Record<string, StudySessionDTO>>({});

  const { data: session, isLoading } = useQuery<StudySessionDTO | null>({
    queryKey: ['study-session', 'current', roomId],
    queryFn: () => getCurrentSessionApi(roomId),
    staleTime: 5000,
  });

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setElapsed(computeElapsed(session ?? null));
  }, [session]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (session?.status === 'ACTIVE') {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session?.status]);

  useEffect(() => {
    if (!socket) return;
    const handleUserStatus = (data: StudySessionDTO) => {
      setOtherSessions((prev) => {
        const newState = { ...prev };
        if (data.status === 'COMPLETED') {
          delete newState[data.userId];
        } else {
          newState[data.userId] = data;
        }
        return newState;
      });
    };
    socket.on('study:user_status', handleUserStatus);
    return () => {
      socket.off('study:user_status', handleUserStatus);
    };
  }, [socket]);

  const startMutation = useMutation({
    mutationFn: () => startSessionApi(roomId, goalInput.trim() || undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['study-session', 'current', roomId],
      });
      setGoalInput('');
      socket?.emit('study:status_update', { roomId, session: data });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ sessionId, action }: { sessionId: string; action: 'pause' | 'resume' | 'finish' }) => {
      switch (action) {
        case 'pause': return pauseSessionApi(roomId, sessionId);
        case 'resume': return resumeSessionApi(roomId, sessionId);
        case 'finish': return finishSessionApi(roomId, sessionId);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['study-session', 'current', roomId],
      });
      socket?.emit('study:status_update', { roomId, session: data });
    },
  });

  const handleStart = () => startMutation.mutate();

  const handleAction = (action: 'pause' | 'resume' | 'finish') => {
    if (session) {
      actionMutation.mutate({ sessionId: session.id, action });
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-gray-500">Loading timer…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* PHẦN TIMER CỦA MÌNH */}
      {!session ? (
        <div className="p-4 space-y-3">
          <input
            type="text"
            placeholder="Study goal (e.g. Learn React)"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="w-full border p-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleStart}
            disabled={startMutation.isPending}
            className={`w-full px-4 py-2 rounded-lg font-semibold text-white ${
              startMutation.isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {startMutation.isPending ? 'Starting…' : 'Start'}
          </button>
          {startMutation.isError && (
            <p className="text-xs text-rose-500">{startMutation.error.message}</p>
          )}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {session.goal && <p className="text-sm text-gray-600 italic">{session.goal}</p>}
          <div className="text-2xl font-mono font-bold text-gray-800">{formatTime(elapsed)}</div>
          <div className="flex gap-2">
            {session.status === 'ACTIVE' ? (
              <>
                <button onClick={() => handleAction('pause')} disabled={actionMutation.isPending} className={`flex-1 px-3 py-2 rounded-lg font-semibold text-white ${actionMutation.isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}>Pause</button>
                <button onClick={() => handleAction('finish')} disabled={actionMutation.isPending} className={`px-3 py-2 rounded-lg font-semibold text-white ${actionMutation.isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600'}`}>Finish</button>
              </>
            ) : (
              <>
                <button onClick={() => handleAction('resume')} disabled={actionMutation.isPending} className={`flex-1 px-3 py-2 rounded-lg font-semibold text-white ${actionMutation.isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Resume</button>
                <button onClick={() => handleAction('finish')} disabled={actionMutation.isPending} className={`px-3 py-2 rounded-lg font-semibold text-white ${actionMutation.isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600'}`}>Finish</button>
              </>
            )}
          </div>
          {actionMutation.isError && <p className="text-xs text-rose-500">{actionMutation.error.message}</p>}
        </div>
      )}

      {/* HIỂN THỊ TRẠNG THÁI CỦA NGƯỜI KHÁC (Đã có đồng hồ đếm giây) */}
      {Object.values(otherSessions).length > 0 && (
        <div className="mt-auto p-4 border-t bg-gray-50">
          <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Mọi người đang học:</h3>
          <div className="space-y-2">
            {Object.values(otherSessions).map((s) => (
              <OtherUserTimer key={s.id} session={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyTimer;