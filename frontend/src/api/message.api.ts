import api from '../lib/axios';

export interface MessageItem {
  id: string;
  clientId?: string;
  content: string;
  roomId: string;
  senderId: string;
  createdAt: string;
}

export interface SendMessageBody {
  content: string;
  clientId?: string;
}

// Gọi API lấy lịch sử tin nhắn của phòng (cursor pagination)
export const getMessagesApi = async (
  roomId: string,
  cursor?: string,
  limit = 50
): Promise<MessageItem[]> => {
  const response = await api.get(`/rooms/${roomId}/messages`, {
    params: { cursor, limit },
  });
  return response.data.data;
};

// Gọi API gửi tin nhắn mới
export const sendMessageApi = async (
  roomId: string,
  body: SendMessageBody
): Promise<MessageItem> => {
  const response = await api.post(`/rooms/${roomId}/messages`, body);
  return response.data.data;
};
