import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveRoomApi } from '../api/room.api';

export const useLeaveRoom = (roomId: string, onSuccessCallback?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leaveRoomApi(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
      onSuccessCallback?.();
    },
  });
};
