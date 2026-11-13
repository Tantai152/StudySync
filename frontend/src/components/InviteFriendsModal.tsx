import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFriendsApi,
} from '../api/friend.api';
import { addRoomMemberApi } from '../api/room.api';
import { useToast } from './ToastContext';

interface FriendUser {
  id: string;
  name: string;
  email: string;
}

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const InviteFriendsModal = ({
  isOpen,
  onClose,
  roomId,
}: InviteFriendsModalProps) => {
  const { show } = useToast();
  const queryClient = useQueryClient();

  const { data: friends = [], isLoading, error } = useQuery<FriendUser[]>({
    queryKey: ['friendsList'],
    queryFn: getFriendsApi,
    enabled: isOpen,
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => addRoomMemberApi(roomId, userId),
    onSuccess: (_data, userId) => {
      const friend = friends.find((f) => f.id === userId);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
      show(`Đã thêm ${friend?.name || userId} vào phòng`, 'success');
    },
    onError: () => {
      show('Không thể thêm thành viên vào phòng', 'error');
    },
  });

  const handleAddFriend = (userId: string) => {
    addMemberMutation.mutate(userId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Đóng modal"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Mời bạn bè vào phòng
        </h2>

        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Đang tải...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            Không thể tải danh sách bạn bè. Vui lòng thử lại.
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
              👥
            </div>
            <p className="text-gray-600">Bạn chưa có bạn bè nào.</p>
            <p className="text-sm text-gray-400 mt-1">
              Hãy kết bạn trước khi mời vào phòng.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg font-bold text-gray-500">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{friend.name}</p>
                    <p className="text-sm text-gray-500">{friend.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAddFriend(friend.id)}
                  disabled={addMemberMutation.isPending}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    addMemberMutation.isPending
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  {addMemberMutation.isPending ? 'Đang thêm...' : '+ Thêm'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteFriendsModal;
