import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import RoomPage from '../pages/RoomPage';
import NotFoundPage from '../pages/NotFoundPage';
import SearchUsersPage from '../pages/SearchUsersPage';
import FriendsPage from '../pages/FriendsPage'; // <-- Import trang mới
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