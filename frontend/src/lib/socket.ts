import { io, Socket } from 'socket.io-client';
import {
  getAccessToken,
  redirectToLogin,
  refreshAccessToken,
  setAccessToken,
} from './axios';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// Giới hạn tần suất gọi /auth/refresh từ connect_error: socket retry mỗi 1-5s,
// nếu refresh cookie đã chết thì không được bắn request liên tục.
const AUTH_REFRESH_COOLDOWN_MS = 10_000;

let socket: Socket | null = null;
let visibilityListenerAttached = false;
let isRefreshingAuth = false;
let lastAuthRefreshAt = 0;

type SocketError = Error & { data?: { code?: string; message?: string } };

// Backend trả "Unauthorized: No token provided" / "Unauthorized: Invalid token".
// jwt.verify ném TokenExpiredError cũng bị bọc thành "Invalid token".
export const isAuthError = (err: SocketError): boolean => {
  const text = [err.message, err.data?.message, err.data?.code]
    .filter(Boolean)
    .join(' ');
  return /unauthorized|jwt expired|token expired|invalid token/i.test(text);
};

const handleVisibilityChange = () => {
  if (document.visibilityState !== 'visible' || !socket) return;
  if (!socket.connected) socket.connect();
};

const attachVisibilityListener = () => {
  if (visibilityListenerAttached) return;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  visibilityListenerAttached = true;
};

const recoverAuth = (target: Socket, onSessionExpired?: () => void) => {
  if (isRefreshingAuth) return;
  const now = Date.now();
  if (now - lastAuthRefreshAt < AUTH_REFRESH_COOLDOWN_MS) return;

  lastAuthRefreshAt = now;
  isRefreshingAuth = true;

  void refreshAccessToken()
    .then(() => {
      // auth là callback nên lần connect() này tự đọc token mới từ getAccessToken().
      if (!target.connected) target.connect();
    })
    .catch((error: unknown) => {
      console.error(
        'Socket token refresh failed:',
        error instanceof Error ? error.message : error
      );
      // Refresh token chết hẳn => phiên đăng nhập hết hạn.
      setAccessToken(null);
      onSessionExpired?.();
      disconnectSocket();
      redirectToLogin('session_expired');
    })
    .finally(() => {
      isRefreshingAuth = false;
    });
};

// Gắn cơ chế refresh-token-on-auth-error cho bất kỳ socket nào (chat, voice).
export const installAuthRecovery = (
  target: Socket,
  onSessionExpired?: () => void
) => {
  target.on('connect_error', (err: SocketError) => {
    console.error('Socket Error:', err.message);
    if (isAuthError(err)) recoverAuth(target, onSessionExpired);
  });
};

export const connectSocket = (): Socket => {
  if (socket) {
    if (!socket.connected) socket.connect();
    attachVisibilityListener();
    return socket;
  }

  socket = io(SOCKET_URL, {
    // Callback chạy lại ở mỗi lần thử kết nối => luôn gửi token mới nhất,
    // không bị kẹt với token đã hết hạn như khi truyền object { token }.
    auth: (cb) => cb({ token: getAccessToken() ?? '' }),
    autoConnect: true,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 20_000,
  });

  installAuthRecovery(socket);

  socket.on('disconnect', (reason: string) => {
    console.warn('Socket disconnect:', reason);
    // Server ngắt chủ động (Render restart/redeploy) thì client không tự reconnect.
    const current = socket;
    if (reason === 'io server disconnect' && current) {
      setTimeout(() => {
        if (socket === current && !current.connected) current.connect();
      }, 1000);
    }
  });

  attachVisibilityListener();
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (visibilityListenerAttached) {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    visibilityListenerAttached = false;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
