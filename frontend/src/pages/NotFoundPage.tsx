import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-full flex-col justify-center items-center bg-gray-50 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-600">
          404 Not Found
        </h2>
        <p className="mt-4 text-gray-600">
          The page you are looking for does not exist.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="px-6 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;