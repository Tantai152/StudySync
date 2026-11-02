import { useState } from 'react';
import type { RoomMemberItem } from '../api/room.api';

interface RoomMemberListProps {
  members: RoomMemberItem[];
  currentUserId: string | null;
  isOwner: boolean;
  isKicking: boolean;
  isLeaving: boolean;
  onKick: (userId: string) => void;
  onLeave: () => void;
}

export const RoomMemberList = ({
  members,
  currentUserId,
  isOwner,
  isKicking,
  isLeaving,
  onKick,
  onLeave,
}: RoomMemberListProps) => {
  const [confirmKickUserId, setConfirmKickUserId] = useState<string | null>(null);
  const [confirmKickUserName, setConfirmKickUserName] = useState('');

  const handleConfirmKick = (member: RoomMemberItem) => {
    setConfirmKickUserId(member.userId);
    setConfirmKickUserName(member.user.name);
  };

  const handleCancelKick = () => {
    setConfirmKickUserId(null);
    setConfirmKickUserName('');
  };

  const handleExecuteKick = () => {
    if (confirmKickUserId) {
      onKick(confirmKickUserId);
      handleCancelKick();
    }
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chưa có thành viên nào trong phòng.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">
        Thành viên phòng ({members.length})
      </h2>

      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {members.map((member) => {
          const isCurrentUser = member.userId === currentUserId;
          const memberIsOwner = member.role === 'OWNER';
          const canKick = isOwner && !isCurrentUser;

          return (
            <div
              key={member.userId}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium text-sm">
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.user.name}
                  </p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {memberIsOwner && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                    Chủ phòng
                  </span>
                )}

                {canKick && (
                  <button
                    onClick={() => handleConfirmKick(member)}
                    disabled={isKicking}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    Kick
                  </button>
                )}

                {!isCurrentUser && !canKick && memberIsOwner && (
                  <span className="text-xs text-gray-400">
                    Không thể kick chủ phòng
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Nút rời phòng cho thành viên thường (không phải chủ phòng) */}
      {!isOwner && (
        <button
          onClick={onLeave}
          disabled={isLeaving}
          className="w-full text-sm bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
        >
          {isLeaving ? 'Đang rời phòng...' : 'Rời phòng'}
        </button>
      )}

      {/* Confirm modal để kick */}
      {confirmKickUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCancelKick} />
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2 text-gray-900">
              Xác nhận kick thành viên
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn mời <strong>{confirmKickUserName}</strong> ra khỏi phòng?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelKick}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleExecuteKick}
                disabled={isKicking}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded disabled:opacity-50 transition-colors"
              >
                {isKicking ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
