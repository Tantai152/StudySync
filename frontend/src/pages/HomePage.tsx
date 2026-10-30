import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col justify-center items-center bg-gray-50 p-6">
      <div className="text-center max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="font-bold text-4xl text-brand-600 mb-4">StudySync</h1>
        <p className="text-lg text-gray-600 mb-8">Study together, independently.</p>

        {user ? (
          <div className="space-y-6">
            <div className="p-4 bg-brand-50 border border-brand-100 rounded-md">
              <p className="text-xl font-semibold text-gray-800">
                Chào mừng, <span className="text-brand-600">{user.name}</span>!
              </p>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>

            <button
              onClick={logout}
              type="button"
              className="w-full py-2.5 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="space-x-4 flex justify-center">
            <Link
              to="/login"
              className="px-6 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors font-medium"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 border border-brand-600 text-brand-600 rounded-md hover:bg-brand-50 transition-colors font-medium"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
