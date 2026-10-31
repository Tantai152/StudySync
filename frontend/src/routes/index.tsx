import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import RoomPage from '../pages/RoomPage';
import NotFoundPage from '../pages/NotFoundPage';
import SearchUsersPage from '../pages/SearchUsersPage'; // <-- Thêm import này
import ProtectedRoute from '../components/ProtectedRoute';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  
  // Protected routes (Phải đăng nhập mới vào được)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/search', // <-- Thêm route mới cho trang tìm kiếm
        element: <SearchUsersPage />,
      },
      {
        path: '/rooms/:roomId',
        element: <RoomPage />,
      },
    ],
  },
  
  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);