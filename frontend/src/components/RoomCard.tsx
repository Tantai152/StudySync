import { Link } from 'react-router-dom';
import type { RoomItem } from '../api/room.api';

interface RoomCardProps {
  room: RoomItem;
  currentUserId: string | null;
}

export const RoomCard = ({ room, currentUserId }: RoomCardProps) => {
  const isOwner = room.ownerId === currentUserId;

  return (
    <Link
      to={`/rooms/${room.id}`}
      className="block group bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-gray-900 text-lg group-hover:text-brand-600 transition-colors">
          {room.name}
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          isOwner
            ? 'bg-blue-50 text-blue-700 border border-blue-100'
            : 'bg-gray-50 text-gray-600 border border-gray-100'
        }`}>
          {isOwner ? 'Chủ phòng' : 'Thành viên'}
        </span>
      </div>

      {room.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {room.description}
        </p>
      )}

      <div className="flex justify-between items-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
        <span>ID: {room.id.slice(-6)}</span>
        <span>
          {new Date(room.createdAt).toLocaleDateString('vi-VN')}
        </span>
      </div>
    </Link>
  );
};
