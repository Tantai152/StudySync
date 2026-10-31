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