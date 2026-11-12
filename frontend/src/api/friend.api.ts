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

// Lấy danh sách lời mời đang chờ
export const getRequestsApi = async () => {
  const response = await api.get('/friend-requests');
  return response.data.data;
};

// Chấp nhận hoặc Từ chối lời mời
export const respondRequestApi = async ({ id, action }: { id: string; action: 'accept' | 'reject' }) => {
  const response = await api.patch(`/friend-requests/${id}`, { action });
  return response.data;
};

// Lấy danh sách bạn bè
export const getFriendsApi = async () => {
  const response = await api.get('/friends');
  return response.data.data;
};