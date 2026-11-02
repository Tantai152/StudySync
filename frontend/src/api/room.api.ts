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