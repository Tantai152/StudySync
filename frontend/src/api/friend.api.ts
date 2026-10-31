import api from '../lib/axios';

// Gọi API tìm kiếm user (trả về mảng user)
export const searchUsersApi = async (query: string) => {
  const response = await api.get(`/users?query=${query}`);
  return response.data.data; 
};

// Gọi API gửi lời mời kết bạn
export const sendFriendRequestApi = async (receiverId: string) => {
  const response = await api.post('/friend-requests', { receiverId });
  return response.data;
};