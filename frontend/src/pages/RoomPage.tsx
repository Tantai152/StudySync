import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  
  // Lưu trữ socket instance
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // LẤY TOKEN: Mày lên Thunder Client gọi Login, copy accessToken dán vào đây để test
    const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbXZ6bDQ1ZWgwMDAxMHVwY3ZzZTMzeGduIiwiaWF0IjoxNzkzNjQ1MDIxLCJleHAiOjE3OTM2NDU5MjF9.e54FLgQos75deo5n-xHtZMOS_omGLEuwaQxtHz-uUAw"; 

    // 1. Kết nối tới Backend Socket
    const newSocket = io('http://localhost:3000', {
      auth: { token: testToken }
    });

    setSocket(newSocket);

    // 2. Lắng nghe sự kiện kết nối thành công
    newSocket.on('connect', () => {
      console.log('✅ Đã kết nối Socket! ID:', newSocket.id);
      setIsConnected(true);
      
      // Gửi yêu cầu tham gia phòng
      if (roomId) {
        newSocket.emit('room:join', roomId);
        console.log('Đã xin vào phòng:', roomId);
      }
    });

    // 3. Lắng nghe tin nhắn mới từ người khác
    newSocket.on('chat:new_message', (msg) => {
      console.log('📩 Nhận tin nhắn mới:', msg);
      setMessages((prev) => [...prev, msg.content]);
    });

    // 4. Lắng nghe lỗi (nếu có)
    newSocket.on('error', (err) => {
      console.error('❌ Lỗi Socket:', err.message);
    });

    // 5. Dọn dẹp khi rời trang
    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  // Hàm gửi tin nhắn
  const handleSendMessage = () => {
    if (socket && inputMsg.trim()) {
      // Gửi lên server qua Socket
      socket.emit('chat:send', {
        roomId: roomId,
        content: inputMsg,
        clientId: Date.now().toString() // ID tạm để tránh trùng lặp
      });
      setInputMsg(''); // Xóa ô nhập
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Phòng: {roomId}</h1>
      
      <div className={`mt-2 font-bold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
        Trạng thái Socket: {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
      </div>

      {/* Khung chat test */}
      <div className="mt-6 border p-4 h-64 overflow-y-auto bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className="mb-2 p-2 bg-white rounded border">{m}</div>
        ))}
        {messages.length === 0 && <p className="text-gray-400">Chưa có tin nhắn nào.</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <input 
          type="text" 
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          className="border p-2 rounded w-full"
          placeholder="Nhập tin nhắn test..."
        />
        <button onClick={handleSendMessage} className="bg-blue-500 text-white px-4 py-2 rounded">
          Gửi
        </button>
      </div>
    </div>
  );
};

export default RoomPage;