import type { MessageItem } from '../api/message.api';

interface MessageBubbleProps {
  message: MessageItem;
  currentUserId: string | null;
}

export const MessageBubble = ({ message, currentUserId }: MessageBubbleProps) => {
  const isMine = message.senderId === currentUserId;
  const time = new Date(message.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex ${
        isMine ? 'justify-end' : 'justify-start'
      } mb-3 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
          isMine
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-gray-100 text-gray-900 rounded-tl-none'
        }`}
      >
        {!isMine && (
          <p className="text-xs text-gray-500 mb-1 font-medium capitalize">
            {message.senderId.slice(-4)}
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className="text-[10px] mt-1 opacity-70 text-right">
          {time}
        </p>
      </div>
    </div>
  );
};
