import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../lib/axios';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schema';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setApiError(null);
    setSuccessMessage(null);
    clearErrors('email'); // Clear previous email errors from API

    try {
      const response = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (response.data.success) {
        setSuccessMessage('Đăng ký thành công! Đang chuyển hướng...');
        reset();
        onSuccess?.();
        // Redirect to login after 1.5 seconds
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; data?: { message?: string; errorCode?: string } } };
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.message;
        const errorCode = axiosError.response?.data?.errorCode;

        if (status === 409 && errorCode === 'EMAIL_ALREADY_EXISTS') {
          // Attach API error to email field using setError
          setError('email', {
            type: 'server',
            message: message || 'Email đã được đăng ký',
          });
        } else if (status === 400 && errorCode === 'VALIDATION_ERROR') {
          // Handle validation errors from backend (shouldn't happen if frontend validates)
          const details = axiosError.response?.data?.details;
          if (details) {
            Object.entries(details).forEach(([field, messages]) => {
              if (messages && Array.isArray(messages) && messages.length > 0) {
                setError(field as keyof RegisterFormData, {
                  type: 'server',
                  message: messages[0],
                });
              }
            });
          }
        } else {
          setApiError(message || 'Đã xảy ra lỗi, vui lòng thử lại');
        }
      } else {
        setApiError('Không thể kết nối đến máy chủ');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Tạo tài khoản</h2>
        <p className="text-gray-600 mt-2">Điền thông tin bên dưới để bắt đầu</p>
      </div>

      {/* API-level error (non-field specific) */}
      {apiError && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"
          role="alert"
        >
          {apiError}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div
          className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm"
          role="alert"
        >
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tên hiển thị
          </label>
          <input
            {...register('name')}
            id="name"
            type="text"
            autoComplete="name"
            className={`w-full px-4 py-2.5 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
              errors.name
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            placeholder="Nguyễn Văn A"
            disabled={isLoading}
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            className={`w-full px-4 py-2.5 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
              errors.email
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            placeholder="email@example.com"
            disabled={isLoading}
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Mật khẩu
          </label>
          <input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="new-password"
            className={`w-full px-4 py-2.5 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
              errors.password
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            placeholder="Ít nhất 8 ký tự"
            disabled={isLoading}
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Xác nhận mật khẩu
          </label>
          <input
            {...register('confirmPassword')}
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={`w-full px-4 py-2.5 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
              errors.confirmPassword
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            placeholder="Nhập lại mật khẩu"
            disabled={isLoading}
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
          {errors.confirmPassword && (
            <p
              id="confirmPassword-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2.5 px-4 rounded-md text-white font-medium text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isLoading
              ? 'bg-brand-400 cursor-not-allowed focus:ring-brand-300'
              : 'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Đang xử lý...
            </span>
          ) : (
            'Đăng ký'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Đã có tài khoản?{' '}
        <a
          href="/login"
          className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          Đăng nhập ngay
        </a>
      </p>
    </div>
  );
};

export default RegisterForm;