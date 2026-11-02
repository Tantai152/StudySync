import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRooms, useCreateRoom } from '../hooks/useRooms';
import { Navbar } from '../components/Navbar';
import { RoomCard } from '../components/RoomCard';
import { CreateRoomModal } from '../components/CreateRoomModal';

interface RoomSkeletonProps {
  count?: number;
}

const RoomSkeleton: React.FC<RoomSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
          <div className="h-20 bg-gray-200 rounded w-full mb-4" />
          <div className="flex justify-between items-center text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
};

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: rooms = [], isLoading, error } = useRooms();
  const createMutation = useCreateRoom();

  const handleCreateRoom = () => {
    setIsCreateModalOpen(true);
  };

  const handleRoomCreated = () => {
    setIsCreateModalOpen(false);
  };

  const currentUserId = user?.id ?? null;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Không thể tải danh sách phòng
            </h1>
            <p className="text-gray-600 mb-6">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Phòng học của bạn
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý và theo dõi các phòng học của bạn
            </p>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={createMutation.isPending}
            className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-1">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang tạo...
              </span>
            ) : (
              '+ Tạo phòng mới'
            )}
          </button>
        </div>

        {isLoading ? (
          <RoomSkeleton count={6} />
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Bạn chưa tham gia phòng nào
            </h2>
            <p className="text-gray-600 mb-6 max-w-xs mx-auto">
              Hãy tạo phòng mới hoặc tham gia phòng qua link mời để bắt đầu học tập cùng bạn bè.
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={createMutation.isPending}
              className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              Tạo phòng đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </main>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRoomCreated}
      />
    </div>
  );
};

export default HomePage;
