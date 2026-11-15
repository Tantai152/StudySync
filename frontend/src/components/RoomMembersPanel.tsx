import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import {
  getRoomMembersApi,
  type RoomMemberActiveSession,
  type RoomMemberItem,
} from '../api/room.api';
import { Avatar } from './Avatar';

interface RoomMembersPanelProps {
  roomId: string;
  currentUserId: string;
  socket: Socket | null;
}

const CrownIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-amber-500 shrink-0"
    aria-hidden="true"
  >
    <path d="M2 8l4 4 6-8 6 8 4-4-2 11H4L2 8Z" />
  </svg>
);

const formatDuration = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const computeElapsed = (session: RoomMemberActiveSession): number => {
  let base = session.duration ?? 0;
  if (session.lastResumedAt) {
    base += Math.floor((Date.now() - Date.parse(session.lastResumedAt)) / 1000);
  }
  return base;
};

const MemberTimer = ({ session }: { session: RoomMemberActiveSession }) => {
  const [elapsed, setElapsed] = useState(() => computeElapsed(session));

  useEffect(() => {
    setElapsed(computeElapsed(session));
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-mono font-semibold text-emerald-700 tabular-nums">
      {formatDuration(elapsed)}
    </span>
  );
};

const MemberRow = ({
  member,
  isMe,
}: {
  member: RoomMemberItem;
  isMe: boolean;
}) => {
  const isOwner = member.role === 'OWNER';
  const session = member.activeSession;
  const goal = session?.goal?.trim();

  return (
    <li className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white">
      <Avatar name={member.name} avatarUrl={member.avatarUrl} size={32} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-sm font-medium text-gray-800">
            {member.name}
            {isMe && <span className="ml-1 font-normal text-gray-400">(bạn)</span>}
          </span>
          {isOwner && (
            <span aria-label="Chủ phòng" title="Chủ phòng" className="flex">
              <CrownIcon />
            </span>
          )}
        </div>

        {session ? (
          <p className="truncate text-xs text-gray-500" title={goal || 'Đang học'}>
            {goal || 'Đang học'}
          </p>
        ) : (
          <p className="text-xs text-gray-400">Đang rảnh</p>
        )}
      </div>

      {session && <MemberTimer session={session} />}
    </li>
  );
};

export const RoomMembersPanel = ({
  roomId,
  currentUserId,
  socket,
}: RoomMembersPanelProps) => {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['roomMembers', roomId],
    queryFn: () => getRoomMembersApi(roomId),
    enabled: !!roomId,
  });

  // Cập nhật lại danh sách khi có người bắt đầu/pause/finish phiên học.
  useEffect(() => {
    if (!socket) return;
    const handleStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['roomMembers', roomId] });
    };
    socket.on('study:user_status', handleStatus);
    return () => {
      socket.off('study:user_status', handleStatus);
    };
  }, [socket, roomId, queryClient]);

  return (
    <section className="border-t bg-gray-50 px-3 py-3" aria-labelledby="room-members-heading">
      <h2
        id="room-members-heading"
        className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500"
      >
        <span>Thành viên phòng</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
          {members.length}
        </span>
      </h2>

      {isLoading ? (
        <p className="py-3 text-center text-xs text-gray-400">Đang tải thành viên…</p>
      ) : members.length === 0 ? (
        <p className="py-3 text-center text-xs text-gray-400">Chưa có thành viên nào.</p>
      ) : (
        <ul className="max-h-64 space-y-0.5 overflow-y-auto">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isMe={member.id === currentUserId}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
