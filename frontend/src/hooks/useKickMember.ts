import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kickMemberApi } from '../api/room.api';

export const useKickMember = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) => kickMemberApi(roomId, targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
    },
  });
};
