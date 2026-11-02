import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useMessages } from '../hooks/useMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { MessageBubble } from './MessageBubble';

interface ChatBoxProps {
  roomId: string;
}

export const ChatBox = ({ roomId }: ChatBoxProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  const currentUserId = user?.id ?? null;

  const { data: messages = [], isLoading, error } = useMessages(roomId);
  const sendMutation = useSendMessage(roomId);

  // Auto-scroll xuống cuối khi messages thay đổi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sendMutation.isPending) return;

    const clientId = crypto.randomUUID();
    sendMutation.mutate({ content: inputValue.trim(), clientId });
    setInputValue('');
  };

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Trò chuyện</h2>
        </div>
        <div className="flex-1 items-center justify-center p-8 text-center">
          <p className="text-red-600 font-medium">
            {error.message || 'Lỗi khi tải lịch sử chat'}
          </p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
            }}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:underline"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Trò chuyện</h2>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            Chưa có tin nhắn nào. Hãy nhắn tin đầu tiên!
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                currentUserId={currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-gray-200 bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nhập tin nhắn..."
            disabled={sendMutation.isPending}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-200 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sendMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sendMutation.isPending ? 'Đang gửi...' : 'Gửi'}
          </button>
        </div>
      </form>
    </div>
  );
};
