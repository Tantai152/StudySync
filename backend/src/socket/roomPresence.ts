import { processRoomSummary } from '../services/summary.service.js';

// Phòng được coi là vắng khi không còn socket chat lẫn voice nào.
const ROOM_EMPTY_TIMEOUT_MS = 2 * 60 * 1000; // 2 phút

// roomId -> set socketId đang ở trong phòng (chat)
const chatPresence = new Map<string, Set<string>>();
// roomId -> set socketId đang ở trong phòng (voice)
const voicePresence = new Map<string, Set<string>>();
// roomId -> timer tóm tắt đang chờ
const roomEmptyTimers = new Map<string, NodeJS.Timeout>();

const addPresence = (
  presence: Map<string, Set<string>>,
  roomId: string,
  socketId: string
) => {
  let sockets = presence.get(roomId);
  if (!sockets) {
    sockets = new Set();
    presence.set(roomId, sockets);
  }
  sockets.add(socketId);
};

const removePresence = (
  presence: Map<string, Set<string>>,
  roomId: string,
  socketId: string
) => {
  const sockets = presence.get(roomId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    presence.delete(roomId);
  }
};

export const cancelRoomEmptyTimer = (roomId: string): void => {
  const timer = roomEmptyTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomEmptyTimers.delete(roomId);
  }
};

export const isRoomEmpty = (roomId: string): boolean =>
  (chatPresence.get(roomId)?.size ?? 0) === 0 &&
  (voicePresence.get(roomId)?.size ?? 0) === 0;

const scheduleSummaryIfEmpty = (roomId: string): void => {
  if (!isRoomEmpty(roomId)) {
    // Vẫn còn người -> huỷ lịch tóm tắt (nếu có)
    cancelRoomEmptyTimer(roomId);
    return;
  }

  // Đã có timer đang chờ thì không tạo thêm
  if (roomEmptyTimers.has(roomId)) return;

  const timer = setTimeout(async () => {
    roomEmptyTimers.delete(roomId);

    // Kiểm tra lại: có thể có người join đúng lúc timer vừa hết
    if (!isRoomEmpty(roomId)) return;

    try {
      await processRoomSummary(roomId);
    } catch (error) {
      console.error(
        `[summary] Lỗi khi tóm tắt phòng ${roomId}:`,
        error instanceof Error ? error.message : 'unknown error'
      );
    }
  }, ROOM_EMPTY_TIMEOUT_MS);

  // Không giữ process sống chỉ vì timer này khi server shutdown
  timer.unref?.();
  roomEmptyTimers.set(roomId, timer);
  console.log(
    `[summary] Phòng ${roomId} vắng người, sẽ tóm tắt sau 2 phút`
  );
};

export const markChatOnline = (roomId: string, socketId: string): void => {
  addPresence(chatPresence, roomId, socketId);
  cancelRoomEmptyTimer(roomId);
};

export const markChatOffline = (roomId: string, socketId: string): void => {
  removePresence(chatPresence, roomId, socketId);
  scheduleSummaryIfEmpty(roomId);
};

export const markVoiceOnline = (roomId: string, socketId: string): void => {
  addPresence(voicePresence, roomId, socketId);
  cancelRoomEmptyTimer(roomId);
};

export const markVoiceOffline = (roomId: string, socketId: string): void => {
  removePresence(voicePresence, roomId, socketId);
  scheduleSummaryIfEmpty(roomId);
};
