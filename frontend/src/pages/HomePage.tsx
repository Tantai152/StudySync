import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="flex min-h-full flex-col justify-center items-center bg-gray-50 p-6">
      <div className="text-center">
        <h1 className="font-bold text-4xl text-brand-600 mb-4">
          StudySync
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Study together, independently.
        </p>
        <div className="space-x-4">
          <Link
            to="/login"
            className="px-6 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-6 py-3 border border-brand-600 text-brand-600 rounded-md hover:bg-brand-50 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;