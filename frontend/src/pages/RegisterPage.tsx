import { RegisterForm } from '../components/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <div className="flex min-h-full flex-col justify-center items-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
};

export default RegisterPage;