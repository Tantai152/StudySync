import { LoginForm } from '../components/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <div className="flex min-h-full flex-col justify-center items-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;