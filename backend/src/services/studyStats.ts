const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_DAYS = 365;

export type CompletedSession = {
  startedAt: Date;
  endedAt: Date | null;
  duration: number;
};

export type HeatmapDay = {
  date: string;
  duration: number;
  level: number;
};

export type StudyStats = {
  heatmap: HeatmapDay[];
  currentStreak: number;
  longestStreak: number;
};

export const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (dateKey: string, days: number): string =>
  toDateKey(new Date(Date.parse(`${dateKey}T00:00:00.000Z`) + days * DAY_MS));

export const toLevel = (durationSeconds: number): number => {
  if (durationSeconds <= 0) return 0;
  if (durationSeconds < 30 * 60) return 1; // < 30 phút
  if (durationSeconds < 60 * 60) return 2; // 30-60 phút
  if (durationSeconds <= 2 * 60 * 60) return 3; // 1-2 tiếng
  return 4; // > 2 tiếng
};

export const computeStudyStats = (
  sessions: CompletedSession[],
  now: Date = new Date()
): StudyStats => {
  const durationByDay = new Map<string, number>();

  for (const session of sessions) {
    if (session.duration <= 0) continue;

    // Một phiên học được tính cho ngày kết thúc.
    const dateKey = toDateKey(session.endedAt ?? session.startedAt);
    durationByDay.set(
      dateKey,
      (durationByDay.get(dateKey) ?? 0) + session.duration
    );
  }

  // Heatmap 365 ngày gần nhất (bao gồm hôm nay), luôn đủ ngày để vẽ lưới.
  const todayKey = toDateKey(now);
  const heatmap: HeatmapDay[] = [];

  for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset -= 1) {
    const dateKey = addDays(todayKey, -offset);
    const duration = durationByDay.get(dateKey) ?? 0;

    heatmap.push({
      date: dateKey,
      duration,
      level: toLevel(duration),
    });
  }

  // Streak dài nhất: duyệt các ngày có học theo thứ tự tăng dần.
  const studiedDays = Array.from(durationByDay.keys()).sort();
  const studiedSet = new Set(studiedDays);

  let longestStreak = 0;
  let run = 0;

  for (let i = 0; i < studiedDays.length; i += 1) {
    const day = studiedDays[i]!;
    const previousDay = i > 0 ? studiedDays[i - 1]! : null;

    run = previousDay && addDays(previousDay, 1) === day ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  // Streak hiện tại: hôm nay chưa học thì vẫn giữ nếu hôm qua có học.
  let cursor = studiedSet.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let currentStreak = 0;

  while (studiedSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    heatmap,
    currentStreak,
    longestStreak,
  };
};
