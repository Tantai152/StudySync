import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessageApi, type MessageItem } from '../api/message.api';

/**
 * Hook gửi tin nhắn mới. Sau khi thành công, invalidate ['messages', roomId] để load lại lịch sử.
 */
export const useSendMessage = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation<MessageItem, Error, { content: string; clientId?: string }>({
    mutationFn: ({ content, clientId }) => sendMessageApi(roomId, { content, clientId }),
    onSuccess: () => {
      // exact: false để prefix-match mọi cache ['messages', roomId, cursor]
      queryClient.invalidateQueries({
        queryKey: ['messages', roomId],
        exact: false,
      });
    },
  });
};
