import { useQuery } from '@tanstack/react-query';
import { getMessagesApi, type MessageItem } from '../api/message.api';

/**
 * Hook lấy lịch sử tin nhắn của phòng (cursor pagination).
 * Query key: ['messages', roomId, cursor]
 */
export const useMessages = (
  roomId: string | undefined,
  cursor?: string,
  limit = 50
) => {
  return useQuery<MessageItem[], Error>({
    queryKey: ['messages', roomId, cursor],
    queryFn: () => getMessagesApi(roomId!, cursor, limit),
    enabled: !!roomId,
    staleTime: 30_000,
  });
};
