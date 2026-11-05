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

/**
 * Bản tóm tắt của một phòng học.
 */
export interface RoomSummaryItem {
  id: string;
  roomId: string;
  roomName: string;
  content: string;
  createdAt: string;
}

/**
 * GET /api/v1/users/me/summaries
 * Lấy danh sách bản tóm tắt mới nhất của tất cả các phòng
 * mà user hiện tại là thành viên.
 */
export const getUserSummariesApi = async (): Promise<RoomSummaryItem[]> => {
  const res = await api.get('/dashboard/summaries');
  return res.data.data;
};