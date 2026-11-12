import api from '../lib/axios';

export interface CreateRoomData {
  name: string;
  description?: string;
}

// Gọi API tạo phòng
export const createRoomApi = async (data: CreateRoomData) => {
  const response = await api.post('/rooms', data);
  return response.data.data;
};

// Gọi API tạo link mời
export const generateInviteLinkApi = async (roomId: string) => {
  const response = await api.post(`/rooms/${roomId}/invites`);
  return response.data.data; // Trả về { link, expiresAt }
};

// Kết quả khi tham gia phòng bằng token mời
export interface JoinRoomResult {
  roomId: string;
  roomName: string;
}

// Gọi API tham gia phòng bằng token trong link mời
export const joinRoomApi = async (token: string): Promise<JoinRoomResult> => {
  const response = await api.post('/rooms/join', { token });
  return response.data.data; // Trả về { roomId, roomName }
};

// Danh sách phòng của user hiện tại
export interface RoomItem {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// Gọi API lấy danh sách phòng của user hiện tại
export const getRoomsApi = async (): Promise<RoomItem[]> => {
  const response = await api.get('/rooms');
  return response.data.data;
};

// Thông tin thành viên phòng trả về từ API
export interface RoomMemberItem {
  id: string;
  roomId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// Gọi API lấy danh sách thành viên phòng
export const getRoomMembersApi = async (roomId: string): Promise<RoomMemberItem[]> => {
  const response = await api.get(`/rooms/${roomId}/members`);
  return response.data.data;
};

// Gọi API kick thành viên khỏi phòng
export const kickMemberApi = async (roomId: string, userId: string): Promise<void> => {
  await api.delete(`/rooms/${roomId}/members/${userId}`);
};

// Gọi API rời phòng (xóa bản ghi thành viên của chính mình)
export const leaveRoomApi = async (roomId: string): Promise<void> => {
  await api.delete(`/rooms/${roomId}/members/me`);
};

// Gọi API xóa phòng (chủ phòng)
export const deleteRoomApi = async (roomId: string): Promise<void> => {
  await api.delete(`/rooms/${roomId}`);
};

// Lấy lịch sử tin nhắn của phòng
export const getMessagesApi = async (roomId: string) => {
  const response = await api.get(`/rooms/${roomId}/messages`);
  return response.data.data; // Trả về mảng tin nhắn
};

// Study Session types
export interface StudySessionDTO {
  id: string;
  userId: string;
  roomId: string;
  goal: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  endedAt: string | null;
  lastResumedAt: string | null;
  duration: number;
}

// Lấy phiên học hiện tại của user trong phòng
export const getCurrentSessionApi = async (roomId: string): Promise<StudySessionDTO | null> => {
  const response = await api.get(`/rooms/${roomId}/sessions/current`);
  return response.data.data;
};

// Bắt đầu phiên học mới
export const startSessionApi = async (
  roomId: string,
  goal?: string
): Promise<StudySessionDTO> => {
  const response = await api.post(`/rooms/${roomId}/sessions/start`, { goal });
  return response.data.data;
};

// Tạm dừng phiên học
export const pauseSessionApi = async (
  roomId: string,
  sessionId: string
): Promise<StudySessionDTO> => {
  const response = await api.patch(
    `/rooms/${roomId}/sessions/${sessionId}/pause`
  );
  return response.data.data;
};

// Khôi phục phiên học
export const resumeSessionApi = async (
  roomId: string,
  sessionId: string
): Promise<StudySessionDTO> => {
  const response = await api.patch(
    `/rooms/${roomId}/sessions/${sessionId}/resume`
  );
  return response.data.data;
};

// Kết thúc phiên học
export const finishSessionApi = async (
  roomId: string,
  sessionId: string
): Promise<StudySessionDTO> => {
  const response = await api.patch(
    `/rooms/${roomId}/sessions/${sessionId}/finish`
  );
  return response.data.data;
};

// Tóm tắt phòng học
export interface RoomSummaryResponse {
  id: string;
  roomId: string;
  content: string;
  createdAt: string;
}

// Lấy bản tóm tắt mới nhất của phòng
export const getRoomSummaryApi = async (
  roomId: string
): Promise<RoomSummaryResponse | null> => {
  const response = await api.get(`/rooms/${roomId}/summary`);
  return response.data.data;
};