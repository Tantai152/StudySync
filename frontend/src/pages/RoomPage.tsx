import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
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
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Khởi tạo Mutation để gọi API
  const mutation = useMutation({
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
      mutation.mutate(roomId);
    }
  };

  // Hàm copy link vào bộ nhớ tạm
  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Đã copy link mời vào clipboard!');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10">
      <div className="bg-white p-8 rounded-lg shadow-md border">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Chi tiết Phòng Học</h1>
        <p className="text-gray-500 mb-8">ID Phòng: {roomId}</p>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Mời bạn bè vào phòng</h2>
          
          {errorMsg && (
            <div className="mb-4 text-red-500 font-medium">{errorMsg}</div>
          )}

          {/* Nếu chưa có link thì hiện nút Tạo. Có link rồi thì hiện ô input và nút Copy */}
          {!inviteLink ? (
            <button
              onClick={handleGenerateLink}
              disabled={mutation.isPending}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {mutation.isPending ? 'Đang tạo link...' : 'Tạo Link Mời'}
            </button>
          ) : (
            <div className="space-y-4 bg-gray-50 p-4 rounded border">
              <p className="text-sm text-gray-600 font-medium">Link mời của bạn đã sẵn sàng:</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-xs text-gray-500">Link này sẽ hết hạn sau 24 giờ.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomPage;