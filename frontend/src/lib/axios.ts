import axios from 'axios';

// 1. Tạo một instance riêng chỉ để gọi API Refresh (không gắn interceptor để tránh vòng lặp)
const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
});

// 2. Biến lưu access token trên RAM
//    Khôi phục từ localStorage ngay khi module nạp để request đầu tiên sau F5
//    vẫn có token (React effect chạy sau khi con render, nên không đủ sớm).
const TOKEN_STORAGE_KEY = 'studysync_token';
let accessToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();
export const getAccessToken = () => accessToken;

// Dùng chung cho Axios và Socket.IO: giữ đúng 1 chỗ quyết định đá người dùng
// về /login, kèm lý do để LoginForm hiển thị thông báo.
export const redirectToLogin = (reason?: 'session_expired') => {
  if (window.location.pathname === '/login') return;
  window.location.href = reason ? `/login?reason=${reason}` : '/login';
};

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// Dùng chung cho Axios interceptor và Socket.IO: nhiều nơi cùng gọi thì chỉ có
// một request /auth/refresh đang chạy, tránh rotate refresh token song song.
let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        const token = response.data.data.accessToken as string;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Hàm xử lý hàng đợi
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 3. Instance chính để gọi API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 4. Request Interceptor: Tự động gắn Access Token vào Header trước khi gửi
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 5. Response Interceptor: Xử lý khi Access Token hết hạn (lỗi 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        redirectToLogin('session_expired');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
