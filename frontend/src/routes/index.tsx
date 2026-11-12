import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import RoomPage from '../pages/RoomPage';
import NotFoundPage from '../pages/NotFoundPage';
import SearchUsersPage from '../pages/SearchUsersPage';
import FriendsPage from '../pages/FriendsPage'; // <-- Import trang mới
import ProtectedRoute from '../components/ProtectedRoute';
import CreateRoomPage from '../pages/CreateRoomPage';
import JoinRoomPage from '../pages/JoinRoomPage';
import DashboardPage from '../pages/DashboardPage';
import ProfilePage from '../pages/ProfilePage';

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
  {
    // Route public: trang tự kiểm tra auth và redirect sang /login
    // kèm returnUrl để sau khi đăng nhập quay lại đúng link join
    path: '/join',
    element: <JoinRoomPage />,
  },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/search',
        element: <SearchUsersPage />,
      },
      {
        path: '/friends', // <-- Thêm route mới ở đây
        element: <FriendsPage />,
      },
      {
        path: '/rooms/create',
        element: <CreateRoomPage />,
      },
      {
        path: '/rooms/:roomId',
        element: <RoomPage />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
    ],
  },
  
  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);