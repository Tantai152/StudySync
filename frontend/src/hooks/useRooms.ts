import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoomsApi, createRoomApi, type RoomItem } from '../api/room.api';

/**
 * Hook lấy danh sách phòng của user hiện tại.
 * Query key: ['rooms']
 */
export const useRooms = () => {
  return useQuery<RoomItem[], Error>({
    queryKey: ['rooms'],
    queryFn: getRoomsApi,
    staleTime: 30_000,
  });
};

/**
 * Hook tạo phòng mới. Sau khi thành công, invalidate ['rooms'] để list tự cập nhật.
 */
export const useCreateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation<RoomItem, Error, { name: string; description?: string }>({
    mutationFn: createRoomApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};
