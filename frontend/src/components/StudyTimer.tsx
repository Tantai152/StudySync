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
import { useToast } from './ToastContext';

interface StudyTimerProps {
  roomId: string;
  variant?: 'sidebar' | 'focus';
  onFocusModeChange?: (active: boolean) => void;
}

interface CountdownTarget {
  target: number;
  fired: boolean;
}

const PRESET_MINUTES = [25, 45] as const;
const CUSTOM_MINUTES_DEFAULT = '30';
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

const targetKey = (sessionId: string) => `studysync:timer-target:${sessionId}`;

const readTarget = (sessionId: string): CountdownTarget | null => {
  try {
    const raw = sessionStorage.getItem(targetKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CountdownTarget>;
    if (typeof parsed.target !== 'number') return null;
    return { target: parsed.target, fired: parsed.fired === true };
  } catch {
    return null;
  }
};

const writeTarget = (sessionId: string, value: CountdownTarget): void => {
  try {
    sessionStorage.setItem(targetKey(sessionId), JSON.stringify(value));
  } catch {
    // sessionStorage bị chặn (private mode): bỏ qua, countdown vẫn chạy trong RAM.
  }
};

const clearTarget = (sessionId: string): void => {
  try {
    sessionStorage.removeItem(targetKey(sessionId));
  } catch {
    // ignore
  }
};

// Tín hiệu hết giờ bằng Web Audio, không cần file asset.
const playAlarm = (): void => {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Context) return;

    const ctx = new Context();
    [0, 0.45, 0.9].forEach((delay) => {
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.45);
    });

    window.setTimeout(() => {
      void ctx.close();
    }, 1600);
  } catch {
    // Trình duyệt chặn audio: đã có toast làm fallback.
  }
};

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

// --- COMPONENT: đếm giây hiển thị tiến trình phiên học ---

const StudyTimer = ({
  roomId,
  variant = 'sidebar',
  onFocusModeChange,
}: StudyTimerProps) => {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
  const [goalInput, setGoalInput] = useState('');

  const [durationMode, setDurationMode] = useState<string>('25');
  const [customMinutes, setCustomMinutes] = useState(CUSTOM_MINUTES_DEFAULT);
  const parsedCustom = Number.parseInt(customMinutes, 10);
  const minutes = durationMode === 'custom' ? parsedCustom : Number(durationMode);
  const minutesValid =
    Number.isInteger(minutes) && minutes >= MIN_MINUTES && minutes <= MAX_MINUTES;

  const isFocus = variant === 'focus';

  const { data: session, isLoading } = useQuery<StudySessionDTO | null>({
    queryKey: ['study-session', 'current', roomId],
    queryFn: () => getCurrentSessionApi(roomId),
    staleTime: 5000,
  });

  const [elapsed, setElapsed] = useState(0);
  const [target, setTarget] = useState<CountdownTarget | null>(null);
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

  // Khôi phục countdown sau khi đổi layout (sidebar <-> focus) hoặc reload tab.
  const sessionId = session?.id;
  const sessionStatus = session?.status;

  useEffect(() => {
    if (!sessionId || sessionStatus === 'COMPLETED') {
      setTarget(null);
      return;
    }
    setTarget(readTarget(sessionId));
  }, [sessionId, sessionStatus]);

  // Hết giờ: báo toast + beep đúng một lần cho mỗi target.
  useEffect(() => {
    if (!target || target.fired || !session) return;
    if (elapsed < target.target) return;

    const fired: CountdownTarget = { ...target, fired: true };
    setTarget(fired);
    writeTarget(session.id, fired);
    playAlarm();
    showToast('Đã hết giờ học, hãy nghỉ ngơi!', 'success');
  }, [target, elapsed, session, showToast]);

  const startMutation = useMutation({
    mutationFn: () => startSessionApi(roomId, goalInput.trim() || undefined),
    onSuccess: (data) => {
      queryClient.setQueryData(['study-session', 'current', roomId], data);
      queryClient.invalidateQueries({
        queryKey: ['study-session', 'current', roomId],
      });
      setGoalInput('');

      if (minutesValid) {
        const nextTarget: CountdownTarget = {
          target: data.duration + minutes * 60,
          fired: false,
        };
        writeTarget(data.id, nextTarget);
        setTarget(nextTarget);
      }

      onFocusModeChange?.(true);
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
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['study-session', 'current', roomId], data);
      queryClient.invalidateQueries({
        queryKey: ['study-session', 'current', roomId],
      });

      if (variables.action === 'finish') {
        clearTarget(variables.sessionId);
        setTarget(null);
      }

      // Pause/Finish rời focus mode; Resume quay lại focus mode.
      onFocusModeChange?.(variables.action === 'resume');
    },
  });

  const handleStart = () => startMutation.mutate();

  const handleAction = (action: 'pause' | 'resume' | 'finish') => {
    if (session) {
      actionMutation.mutate({ sessionId: session.id, action });
    }
  };

  if (isLoading) {
    return (
      <div className={isFocus ? 'text-sm text-slate-400' : 'p-4 text-center text-sm text-gray-500'}>
        Loading timer…
      </div>
    );
  }

  const remaining =
    target && session ? Math.max(0, target.target - elapsed) : null;
  const displaySeconds = remaining ?? elapsed;

  const clockClassName = isFocus
    ? 'font-mono text-7xl font-bold leading-none tracking-tight text-white tabular-nums drop-shadow-[0_0_45px_rgba(129,140,248,0.35)] sm:text-8xl md:text-9xl lg:text-[11rem]'
    : 'font-mono text-2xl font-bold text-gray-800 tabular-nums';

  const primaryButton = (action: 'pause' | 'resume') => {
    const label = action === 'pause' ? 'Pause' : 'Resume';
    const color =
      action === 'pause'
        ? 'bg-amber-500 hover:bg-amber-600'
        : 'bg-emerald-600 hover:bg-emerald-700';
    return (
      <button
        onClick={() => handleAction(action)}
        disabled={actionMutation.isPending}
        className={`${isFocus ? 'px-10 py-4 text-lg' : 'flex-1 px-3 py-2'} rounded-xl font-semibold text-white transition-colors ${
          actionMutation.isPending ? 'bg-gray-500 cursor-not-allowed' : color
        }`}
      >
        {label}
      </button>
    );
  };

  const finishButton = (
    <button
      onClick={() => handleAction('finish')}
      disabled={actionMutation.isPending}
      className={`${isFocus ? 'px-10 py-4 text-lg' : 'px-3 py-2'} rounded-xl font-semibold text-white transition-colors ${
        actionMutation.isPending ? 'bg-gray-500 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600'
      }`}
    >
      Finish
    </button>
  );

  return (
    <div className={isFocus ? 'flex flex-col items-center' : 'flex flex-col'}>
      {/* PHẦN TIMER CỦA MÌNH */}
      {!session ? (
        <div className="space-y-3 p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Thời lượng
            </p>
            <div className="flex gap-2">
              {PRESET_MINUTES.map((preset) => {
                const active = durationMode === String(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDurationMode(String(preset))}
                    aria-pressed={active}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {preset} phút
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDurationMode('custom')}
                aria-pressed={durationMode === 'custom'}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  durationMode === 'custom'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tùy chỉnh
              </button>
            </div>
            {durationMode === 'custom' && (
              <input
                type="number"
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none"
                aria-label="Số phút tùy chỉnh"
              />
            )}
            {!minutesValid && (
              <p className="text-xs text-rose-500">
                Số phút phải từ {MIN_MINUTES} đến {MAX_MINUTES}.
              </p>
            )}
          </div>

          <input
            type="text"
            placeholder="Study goal (e.g. Learn React)"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleStart}
            disabled={startMutation.isPending || !minutesValid}
            className={`w-full rounded-xl px-4 py-3 font-semibold text-white transition-colors ${
              startMutation.isPending || !minutesValid
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {startMutation.isPending ? 'Starting…' : 'Start'}
          </button>
          {startMutation.isError && (
            <p className="text-xs text-rose-500">{startMutation.error.message}</p>
          )}
        </div>
      ) : isFocus ? (
        <div className="flex flex-col items-center gap-8">
          {session.goal && (
            <p className="max-w-xl text-center text-lg italic text-slate-300">
              “{session.goal}”
            </p>
          )}
          <div className={clockClassName}>{formatTime(displaySeconds)}</div>
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-indigo-300">
            {remaining !== null ? 'Thời gian còn lại' : 'Thời gian đã học'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {session.status === 'ACTIVE' ? primaryButton('pause') : primaryButton('resume')}
            {finishButton}
          </div>
          {actionMutation.isError && (
            <p className="text-xs text-rose-400">{actionMutation.error.message}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {session.goal && <p className="text-sm italic text-gray-600">{session.goal}</p>}
          <div className={clockClassName}>{formatTime(displaySeconds)}</div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {remaining !== null ? 'Thời gian còn lại' : 'Thời gian đã học'}
          </p>
          <div className="flex gap-2">
            {session.status === 'ACTIVE' ? primaryButton('pause') : primaryButton('resume')}
            {finishButton}
          </div>
          {session.status === 'ACTIVE' && (
            <button
              onClick={() => onFocusModeChange?.(true)}
              className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              Vào chế độ tập trung
            </button>
          )}
          {actionMutation.isError && (
            <p className="text-xs text-rose-500">{actionMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Trạng thái thành viên đã được tách sang component RoomMembersPanel */}
    </div>
  );
};

export default StudyTimer;
