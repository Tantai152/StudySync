import type { MessageItem } from '../api/message.api';
import { Avatar } from './Avatar';

interface MessageBubbleProps {
  message: MessageItem;
  currentUserId: string | null;
}

export const MessageBubble = ({ message, currentUserId }: MessageBubbleProps) => {
  const isMine = message.senderId === currentUserId;
  const senderName = message.sender?.name ?? 'Người dùng';
  const time = new Date(message.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex items-end gap-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
        isMine ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isMine && (
        <Avatar
          name={senderName}
          avatarUrl={message.sender?.avatarUrl}
          size={32}
          className="mb-5"
        />
      )}

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <p className="text-xs text-gray-500 mb-1 font-medium">{senderName}</p>
        )}

        <div
          className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
            isMine
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-gray-100 text-gray-900 rounded-tl-none'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'} text-right`}>
            {time}
          </p>
        </div>
      </div>
    </div>
  );
};
