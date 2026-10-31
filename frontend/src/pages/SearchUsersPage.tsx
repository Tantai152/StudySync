import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchUsersApi, sendFriendRequestApi } from '../api/friend.api';

const SearchUsersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const queryClient = useQueryClient();

  // 1. Debounce: Đợi user ngừng gõ 500ms mới gọi API (tránh spam)
  // (Mẹo nhỏ để tối ưu hiệu năng)
  if (searchTerm && searchTerm !== debouncedTerm) {
    setTimeout(() => setDebouncedTerm(searchTerm), 500);
  }

  // 2. Dùng TanStack Query để tìm kiếm
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['searchUsers', debouncedTerm],
    queryFn: () => searchUsersApi(debouncedTerm),
    enabled: debouncedTerm.length >= 2, // Chỉ tìm khi gõ >= 2 ký tự
  });

  // 3. Dùng Mutation để gửi lời mời
  const mutation = useMutation({
    mutationFn: sendFriendRequestApi,
    onSuccess: () => {
      alert('Gửi lời mời kết bạn thành công!');
      // Có thể invalidate cache ở đây nếu muốn
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi gửi lời mời');
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Tìm kiếm bạn bè</h1>
      
      {/* Ô tìm kiếm */}
      <input
        type="text"
        placeholder="Nhập tên hoặc email..."
        className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Trạng thái Loading / Error */}
      {isLoading && <p className="text-gray-500">Đang tìm kiếm...</p>}
      {isError && <p className="text-red-500">Lỗi khi tìm kiếm.</p>}

      {/* Danh sách kết quả */}
      <div className="space-y-3">
        {users?.map((user: any) => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
            <div>
              <p className="font-semibold text-lg">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={() => mutation.mutate(user.id)}
              disabled={mutation.isPending}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {mutation.isPending ? 'Đang gửi...' : 'Kết bạn'}
            </button>
          </div>
        ))}
        
        {/* Trạng thái rỗng */}
        {users?.length === 0 && debouncedTerm.length >= 2 && (
          <p className="text-gray-500 text-center">Không tìm thấy người dùng nào.</p>
        )}
      </div>
    </div>
  );
};

export default SearchUsersPage;