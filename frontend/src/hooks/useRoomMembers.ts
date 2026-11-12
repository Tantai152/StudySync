import { useQuery } from '@tanstack/react-query';
import { getRoomMembersApi } from '../api/room.api';

export const useRoomMembers = (roomId: string | undefined) => {
  return useQuery({
    queryKey: ['roomMembers', roomId],
    queryFn: () => getRoomMembersApi(roomId!),
    enabled: !!roomId,
    staleTime: 30_000,
  });
};
