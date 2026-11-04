import api from '../lib/axios';

export interface DashboardStats {
  totalSeconds: number;
  totalSessions: number;
  recentSessions: {
    id: string;
    goal: string | null;
    duration: number;
    endedAt: string;
    room: { name: string };
  }[];
}

export const getDashboardStatsApi = async (): Promise<DashboardStats> => {
  const res = await api.get('/dashboard/stats');
  return res.data.data;
};