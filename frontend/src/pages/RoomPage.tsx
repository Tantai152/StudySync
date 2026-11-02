import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useRoomMembers } from '../hooks/useRoomMembers';
import { useKickMember } from '../hooks/useKickMember';
import { useLeaveRoom } from '../hooks/useLeaveRoom';
import { RoomMemberList } from '../components/RoomMemberList';
import { ChatBox } from '../components/ChatBox';
import { generateInviteLinkApi } from '../api/room.api';
import { AxiosError } from 'axios';

// Khai báo kiểu dữ liệu chuẩn (không dùng any để CI không báo lỗi)
interface InviteData {
  link: string;
  expiresAt: string;
}

interface ErrorResponse {
  message: string;
}

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [redirectToHome, setRedirectToHome] = useState(false);

  // Hooks phải được gọi trước mọi early return (React Rules of Hooks)
  const safeRoomId = roomId ?? '';

  // Khởi tạo Mutation để gọi API tạo link mời
  const inviteMutation = useMutation({
    mutationFn: generateInviteLinkApi,
    onSuccess: (data: InviteData) => {
      setInviteLink(data.link);
      setErrorMsg('');
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      setErrorMsg(error.response?.data?.message || 'Lỗi khi tạo link mời');
    },
  });

  const handleGenerateLink = () => {
    if (roomId) {
      inviteMutation.mutate(roomId);
    }
  };

  // Hàm copy link vào bộ nhớ tạm
  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Đã copy link mời vào clipboard!');
    }
  };

  // TanStack Query: lấy danh sách thành viên phòng
  const { data: members = [], isLoading: membersLoading } = useRoomMembers(
    safeRoomId || undefined
  );

  // Xác định vai trò của user hiện tại trong phòng từ dữ liệu thành viên
  const currentUserId = user?.id ?? null;
  const currentUserMembership = members.find((m) => m.userId === currentUserId);
  const isOwner = currentUserMembership?.role === 'OWNER';

  // Mutation: kick thành viên
  const kickMutation = useKickMember(safeRoomId);

  // Mutation: rời phòng
  const leaveMutation = useLeaveRoom(safeRoomId, () => {
    setRedirectToHome(true);
  });

  const handleKick = (targetUserId: string) => {
    kickMutation.mutate(targetUserId);
  };

  const handleLeave = () => {
    leaveMutation.mutate();
  };

  if (!roomId || redirectToHome) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Header phòng */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Phòng học #{roomId.slice(-6)}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                ID phòng: {roomId}
              </p>
            </div>

            {/* Nút tạo link mời (dạng nhỏ, nằm header)} */}
            {!inviteLink ? (
              <button
                onClick={handleGenerateLink}
                disabled={inviteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {inviteMutation.isPending ? 'Đang tạo...' : 'Tạo Link Mời'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 whitespace-nowrap transition-colors"
                >
                  Copy
                </button>
              </div>
            )}

            {errorMsg && (
              <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Nội dung chính: 2 cột (desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Cột trái: Danh sách thành viên (3 cột trên desktop) */}
          <div className="lg:col-span-3">
            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Thành viên phòng ({members.length})
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                {membersLoading ? (
                  <div className="p-4 flex items-center justify-center text-gray-500">
                    Đang tải...
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Chưa có thành viên nào
                  </div>
                ) : (
                  <RoomMemberList
                    members={members}
                    currentUserId={currentUserId}
                    isOwner={isOwner}
                    isKicking={kickMutation.isPending}
                    isLeaving={leaveMutation.isPending}
                    onKick={handleKick}
                    onLeave={handleLeave}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Cột phải: Khung chat (9 cột trên desktop) */}
          <div className="lg:col-span-9">
            <ChatBox roomId={safeRoomId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
