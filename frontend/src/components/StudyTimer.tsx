import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const StudyTimer = ({ roomId }: StudyTimerProps) => {
  const queryClient = useQueryClient();
  const [goalInput, setGoalInput] = useState('');

  const {
    data: session,
    isLoading,
    refetch,
  } = useQuery<StudySessionDTO | null>({
    queryKey: ['study-session', 'current', roomId],
    queryFn: () => getCurrentSessionApi(roomId),
    staleTime: 5000,
  });

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recompute elapsed whenever session changes
  useEffect(() => {
    setElapsed(computeElapsed(session ?? null));
  }, [session]);

  // Tick every second when ACTIVE
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

  const startMutation = useMutation({
    mutationFn: () => startSessionApi(roomId, goalInput.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['study-session', 'current', roomId],
      });
      setGoalInput('');
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({
      sessionId,
      action,
    }: {
      sessionId: string;
      action: 'pause' | 'resume' | 'finish';
    }) => {
      switch (action) {
        case 'pause':
          return pauseSessionApi(roomId, sessionId);
        case 'resume':
          return resumeSessionApi(roomId, sessionId);
        case 'finish':
          return finishSessionApi(roomId, sessionId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['study-session', 'current', roomId],
      });
    },
  });

  const handleStart = () => {
    startMutation.mutate();
  };

  const handleAction = (action: 'pause' | 'resume' | 'finish') => {
    if (session) {
      actionMutation.mutate({ sessionId: session.id, action });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">Loading timer…</div>
    );
  }

  if (!session) {
    return (
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
            startMutation.isPending
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {startMutation.isPending ? 'Starting…' : 'Start'}
        </button>
        {startMutation.isError && (
          <p className="text-xs text-rose-500">{startMutation.error.message}</p>
        )}
      </div>
    );
  }

  const isActive = session.status === 'ACTIVE';
  const isPaused = session.status === 'PAUSED';

  return (
    <div className="p-4 space-y-4">
      {session.goal && (
        <p className="text-sm text-gray-600 italic">{session.goal}</p>
      )}
      <div className="text-2xl font-mono font-bold text-gray-800">
        {formatTime(elapsed)}
      </div>
      <div className="flex gap-2">
        {isActive ? (
          <>
            <button
              onClick={() => handleAction('pause')}
              disabled={actionMutation.isPending}
              className={`flex-1 px-3 py-2 rounded-lg font-semibold text-white ${
                actionMutation.isPending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {actionMutation.isPending ? '…' : 'Pause'}
            </button>
            <button
              onClick={() => handleAction('finish')}
              disabled={actionMutation.isPending}
              className={`px-3 py-2 rounded-lg font-semibold text-white ${
                actionMutation.isPending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {actionMutation.isPending ? '…' : 'Finish'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleAction('resume')}
              disabled={actionMutation.isPending}
              className={`flex-1 px-3 py-2 rounded-lg font-semibold text-white ${
                actionMutation.isPending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {actionMutation.isPending ? '…' : 'Resume'}
            </button>
            <button
              onClick={() => handleAction('finish')}
              disabled={actionMutation.isPending}
              className={`px-3 py-2 rounded-lg font-semibold text-white ${
                actionMutation.isPending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {actionMutation.isPending ? '…' : 'Finish'}
            </button>
          </>
        )}
      </div>
      {actionMutation.isError && (
        <p className="text-xs text-rose-500">{actionMutation.error.message}</p>
      )}
    </div>
  );
};

export default StudyTimer;
