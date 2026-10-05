import { Link } from 'react-router-dom';

const LoginPage: React.FC = () => {
  return (
    <div className="flex min-h-full flex-col justify-center items-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-center text-brand-600">
          Login Page
        </h2>
        <p className="text-center text-gray-600">
          Please sign in to continue.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="w-full px-6 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;