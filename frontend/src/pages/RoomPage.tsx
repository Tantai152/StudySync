import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMessagesApi } from '../api/room.api';
import api, { getAccessToken } from '../lib/axios';
import { connectSocket } from '../lib/socket';

interface Message {
  id: string;
  clientId: string | null;
  content: string;
  senderId: string;
  createdAt: string;
}

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [inputMsg, setInputMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // 1. "Mồi" Axios bằng API /friends để tự động Refresh Token nếu bị 401
  const { data: friendsData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await api.get('/friends'); 
      return res.data.data;
    },
    retry: false,
  });

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

  // 4. Khởi tạo Socket
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const socket = connectSocket(); 
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('room:join', roomId);
    };

    const handleDisconnect = () => setIsConnected(false);

    const handleNewMessage = (newMessage: Message) => {
      queryClient.setQueryData(['messages', roomId], (oldMessages: Message[] | undefined) => {
        if (!oldMessages) return [newMessage];
        // Chống trùng lặp tin nhắn
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
  }, [roomId, currentUserId, queryClient]);

  // 5. Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. Xử lý gửi tin nhắn
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMsg.trim()) {
      const socket = connectSocket();
      if (socket) {
        const clientId = Date.now().toString();
        socket.emit('chat:send', { roomId, content: inputMsg, clientId });
        setInputMsg('');
      }
    }
  };

  if (isLoadingUser || isLoadingMessages) {
    return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu phòng chat...</div>;
  }

  return (
    <div className="flex flex-col h-[85vh] max-w-4xl mx-auto my-6 bg-white border rounded-xl shadow-lg overflow-hidden">
      {/* HEADER */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md z-10">
        <h1 className="text-xl font-bold">Phòng Chat</h1>
        <div className="flex items-center gap-2 text-sm bg-blue-700 px-3 py-1 rounded-full">
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`}></span>
          {isConnected ? 'Trực tuyến' : 'Đang kết nối...'}
        </div>
      </div>

      {/* DANH SÁCH TIN NHẮN */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 mt-10">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${
                isMe 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border rounded-bl-none'
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

      {/* KHUNG NHẬP TIN NHẮN */}
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
  );
};

export default RoomPage;