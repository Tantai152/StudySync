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