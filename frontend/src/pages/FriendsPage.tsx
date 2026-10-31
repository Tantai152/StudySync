import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequestsApi, respondRequestApi, getFriendsApi } from '../api/friend.api';

interface FriendUser {
  id: string;
  name: string;
  email: string;
}

interface FriendRequest {
  id: string;
  sender: FriendUser;
}

const FriendsPage = () => {
  const queryClient = useQueryClient();

  // Lấy danh sách lời mời
  const { data: requests, isLoading: isLoadingRequests } = useQuery<FriendRequest[]>({
    queryKey: ['pendingRequests'],
    queryFn: getRequestsApi,
  });

  // Lấy danh sách bạn bè
  const { data: friends, isLoading: isLoadingFriends } = useQuery<FriendUser[]>({
    queryKey: ['friendsList'],
    queryFn: getFriendsApi,
  });

  // Xử lý Accept/Reject
  const mutation = useMutation({
    mutationFn: respondRequestApi,
    onSuccess: () => {
      // Load lại cả 2 danh sách sau khi xử lý thành công
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendsList'] });
    },
  });

  const handleRespond = (id: string, action: 'accept' | 'reject') => {
    mutation.mutate({ id, action });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Bạn bè</h1>

      {/* Phần 1: Lời mời đang chờ */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-blue-600">Lời mời kết bạn ({requests?.length || 0})</h2>
        {isLoadingRequests ? (
          <p>Đang tải...</p>
        ) : requests?.length === 0 ? (
          <p className="text-gray-500">Không có lời mời nào.</p>
        ) : (
          <div className="space-y-3">
            {requests?.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                <div>
                  <p className="font-semibold">{req.sender.name}</p>
                  <p className="text-sm text-gray-500">{req.sender.email}</p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleRespond(req.id, 'accept')}
                    disabled={mutation.isPending}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                  >
                    Chấp nhận
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'reject')}
                    disabled={mutation.isPending}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Phần 2: Danh sách bạn bè */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-green-600">Danh sách bạn bè ({friends?.length || 0})</h2>
        {isLoadingFriends ? (
          <p>Đang tải...</p>
        ) : friends?.length === 0 ? (
          <p className="text-gray-500">Bạn chưa có người bạn nào. Hãy vào trang Tìm kiếm để kết bạn nhé!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends?.map((friend) => (
              <div key={friend.id} className="p-4 bg-white border rounded-lg shadow-sm flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500">
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{friend.name}</p>
                  <p className="text-sm text-gray-500">{friend.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FriendsPage;