import api from '../lib/axios';

export interface StudySessionData {
  id: string;
  roomId: string;
  userId: string;
  goal: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  endedAt: string | null;
  duration: number;
}

export const getCurrentSessionApi = async (roomId: string) => {
  const res = await api.get(`/rooms/${roomId}/sessions/current`);
  return res.data.data as StudySessionData | null;
};

export const startSessionApi = async (roomId: string, goal?: string) => {
  const res = await api.post(`/rooms/${roomId}/sessions/start`, { goal });
  return res.data.data as StudySessionData;
};

export const pauseSessionApi = async (roomId: string, sessionId: string) => {
  const res = await api.patch(`/rooms/${roomId}/sessions/${sessionId}/pause`);
  return res.data.data as StudySessionData;
};

export const resumeSessionApi = async (roomId: string, sessionId: string) => {
  const res = await api.patch(`/rooms/${roomId}/sessions/${sessionId}/resume`);
  return res.data.data as StudySessionData;
};

export const finishSessionApi = async (roomId: string, sessionId: string) => {
  const res = await api.patch(`/rooms/${roomId}/sessions/${sessionId}/finish`);
  return res.data.data as StudySessionData;
};