import axios from 'axios';

// 1. Tạo một instance riêng chỉ để gọi API Refresh (không gắn interceptor để tránh vòng lặp)
const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  withCredentials: true, 
});

// 2. Biến lưu access token trên RAM
let accessToken: string | null = null;
let isRefreshing = false;
let failedQueue: any[] = [];

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// Hàm xử lý hàng đợi (để tránh gọi refresh 3 lần khi 3 API cùng lỗi 401 một lúc)
const processQueue = (error: any, token: string | null = null) => {
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
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
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
  (response) => response, // Nếu thành công thì cho qua
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi là 401, không phải là API login/refresh, và chưa thử lại
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      // Nếu đang có một request khác đang gọi refresh, xếp hàng đợi
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

      originalRequest._retry = true; // Đánh dấu đã thử lại để tránh lặp vô hạn
      isRefreshing = true;

      try {
        // Gọi API Refresh
        const response = await refreshClient.post('/auth/refresh');
        const newAccessToken = response.data.data.accessToken;

        // Lưu token mới
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        // Gắn token mới vào request ban đầu và gọi lại
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Nếu refresh cũng thất bại (Refresh token hết hạn/không hợp lệ)
        processQueue(refreshError, null);
        setAccessToken(null);
        
        // Chuyển hướng về trang Login (có thể dùng window.location hoặc react-router)
        window.location.href = '/login'; 
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;