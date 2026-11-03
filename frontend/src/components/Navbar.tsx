import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              SS
            </div>
            <Link
              to="/"
              className="font-bold text-xl text-gray-800 tracking-tight"
            >
              StudySync
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/friends"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Bạn bè
                </Link>
                <span className="text-sm text-gray-700 hidden sm:block">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Trang chủ
                </Link>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
