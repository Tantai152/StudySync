import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMessagesApi,
  generateInviteLinkApi,
  getRoomSummaryApi,
  getRoomsApi,
  getRoomMembersApi,
  leaveRoomApi,
  deleteRoomApi,
} from '../api/room.api';
import api, { getAccessToken } from '../lib/axios';
import { connectSocket, getSocket } from '../lib/socket';
import { useToast } from '../components/ToastContext';
import StudyTimer from '../components/StudyTimer';
import VoicePanel from '../components/VoicePanel';

// Icon mời bạn bè
const UserPlusIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="16 11 12 17 8 11" />
  </svg>
);

interface Message {
  id: string;
  clientId: string | null;
  content: string;
  senderId: string;
  createdAt: string;
}

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [inputMsg, setInputMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();

  // Modal tóm tắt
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    id: string;
    roomId: string;
    content: string;
    createdAt: string;
  } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const loadRoomSummary = async () => {
    if (!roomId) return;
    setIsLoadingSummary(true);
    try {
      const summary = await getRoomSummaryApi(roomId);
      setSummaryData(summary);
    } catch {
      setSummaryData(null);
      showToast('Không thể tải tóm tắt phòng', 'error');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Lấy Socket Instance
  const socket = getSocket() || connectSocket();

  // 1. "Mồi" Axios bằng API /friends để tự động Refresh Token
  const { data: friendsData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await api.get('/friends'); 
      return res.data.data;
    },
    retry: false,
  });

  // Danh sách phòng của user (dùng để lấy tên phòng hiện tại)
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRoomsApi,
  });

  const roomName = rooms.find((r) => r.id === roomId)?.name || 'Phòng';

  // Thành viên phòng (dùng để xác định vai trò OWNER/MEMBER của chính mình)
  const { data: members = [] } = useQuery({
    queryKey: ['roomMembers', roomId],
    queryFn: () => getRoomMembersApi(roomId!),
    enabled: !!roomId && !!currentUserId,
  });

  const isOwner = members.some(
    (m) => m.userId === currentUserId && m.role === 'OWNER'
  );

  // 2. Trích xuất userId từ Token
  useEffect(() => {
    if (friendsData) { 
      const token = getAccessToken();
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          setCurrentUserId(payload.userId);
        } catch (e) {
          console.error("Lỗi giải mã token", e);
        }
      }
    }
  }, [friendsData]);

  // 3. Lấy lịch sử chat
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', roomId],
    queryFn: () => getMessagesApi(roomId!),
    enabled: !!roomId && !!currentUserId, 
  });

  // 4. Khởi tạo Socket cho Chat
  useEffect(() => {
    if (!roomId || !currentUserId || !socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('room:join', roomId);
    };

    const handleDisconnect = () => setIsConnected(false);

    const handleNewMessage = (newMessage: Message) => {
      queryClient.setQueryData(['messages', roomId], (oldMessages: Message[] | undefined) => {
        if (!oldMessages) return [newMessage];
        const isDuplicate = oldMessages.some(m => m.id === newMessage.id || (m.clientId && m.clientId === newMessage.clientId));
        if (isDuplicate) return oldMessages;
        return [...oldMessages, newMessage];
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:new_message', handleNewMessage);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:new_message', handleNewMessage);
    };
  }, [roomId, currentUserId, queryClient, socket]);

  // 5. Tự động cuộn
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. Gửi tin nhắn
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMsg.trim() && socket) {
      const clientId = Date.now().toString();
      socket.emit('chat:send', { roomId, content: inputMsg, clientId });
      setInputMsg('');
    }
  };

  // 7. Tạo link mời
  const handleCopyInvite = async () => {
    try {
      const { link } = await generateInviteLinkApi(roomId!);
      await navigator.clipboard.writeText(link);
      showToast('Đã copy link mời!', 'success');
    } catch (error) {
      showToast('Không thể tạo link mời. Vui lòng thử lại.', 'error');
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomId) return;
    if (!window.confirm('Bạn chắc chắn muốn xóa phòng này? Tất cả dữ liệu trong phòng sẽ bị xóa.')) {
      return;
    }
    try {
      await deleteRoomApi(roomId);
      setSettingsOpen(false);
      navigate('/');
    } catch {
      showToast('Không thể xóa phòng. Vui lòng thử lại.', 'error');
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId) return;
    if (!window.confirm('Bạn chắc chắn muốn rời phòng này?')) {
      return;
    }
    try {
      await leaveRoomApi(roomId);
      setSettingsOpen(false);
      navigate('/');
    } catch {
      showToast('Không thể rời phòng. Vui lòng thử lại.', 'error');
    }
  };

  if (isLoadingUser || isLoadingMessages) {
    return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu phòng chat...</div>;
  }

  return (
    <React.Fragment>
      <div className="flex flex-col h-[85vh] max-w-6xl mx-auto my-6 bg-white border rounded-xl shadow-lg overflow-hidden">
      {/* HEADER */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md z-10">
        <div>
          <h1 className="text-xl font-bold">Phòng Chat</h1>
          <div className="flex items-center gap-2 text-sm mt-1">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`}></span>
            {isConnected ? 'Trực tuyến' : 'Đang kết nối...'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon />
            <span>Mời bạn bè</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setSettingsOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
              aria-label="Cài đặt phòng"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
              <span>Cài đặt</span>
            </button>

            {settingsOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                onClick={(e) => e.stopPropagation()}
              >
                {isOwner ? (
                  <button
                    onClick={handleDeleteRoom}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Xóa phòng
                  </button>
                ) : (
                  <button
                    onClick={handleLeaveRoom}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Rời phòng
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden">
        {/* MAIN: messages + input */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
            {messages.length === 0 && (
              <p className="text-center text-gray-500 mt-10">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${
                    isMe ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'
                  }`}>
                    <p className="break-words">{msg.content}</p>
                    <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-100 text-right' : 'text-gray-400 text-left'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 border p-3 rounded-lg focus:outline-none focus:border-blue-500 bg-gray-50"
            />
            <button
              type="submit"
              disabled={!isConnected || !inputMsg.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              Gửi
            </button>
          </form>
        </div>

        {/* SIDEBAR */}
        {roomId && (
          <div className="w-72 border-l bg-gray-50 flex flex-col">
            {/* ĐÃ THÊM prop socket={socket} VÀO DƯỚI ĐÂY */}
            <StudyTimer roomId={roomId} socket={socket} />
            <VoicePanel roomId={roomId} />

            {/* Nút xem tóm tắt */}
            <button
              onClick={() => {
                setShowSummaryModal(true);
                loadRoomSummary();
              }}
              className="mt-4 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
              disabled={isLoadingSummary}
            >
              {isLoadingSummary ? 'Đang tải...' : 'Xem tóm tắt gần nhất'}
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Modal xem tóm tắt */}
    {showSummaryModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={() => setShowSummaryModal(false)}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        />
        <div
          className="relative bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowSummaryModal(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            aria-label="Đóng modal"
          >
            ✕
          </button>

          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Tóm tắt buổi học
          </h2>

          {isLoadingSummary ? (
            <div className="p-10 text-center text-gray-500">Đang tải...</div>
          ) : summaryData ? (
            <div className="space-y-3">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-gray-600">
                  Phòng: {roomName}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(summaryData.createdAt).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {summaryData.content}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-500">
              <div className="text-2xl mb-2">📝</div>
              <p className="font-medium text-gray-600">
                Chưa có bản tóm tắt cho phòng này.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Tóm tắt sẽ được sinh tự động sau khi buổi học kết thúc và phòng vắng người 2 phút.
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowSummaryModal(false)}
              className="px-6 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )}
    </React.Fragment>
  );
};

export default RoomPage;