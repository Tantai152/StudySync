import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { joinRoomApi, type JoinRoomResult } from '../api/room.api';
import { useAuth } from '../hooks/useAuth';

// Body lỗi chuẩn của backend: { success: false, message, errorCode }
interface ApiErrorBody {
  message?: string;
  errorCode?: string;
}

interface JoinErrorProps {
  message: string;
}

const JoinError = ({ message }: JoinErrorProps) => (
  <div>
    <p className="text-red-600 font-medium mb-1">Không thể tham gia phòng</p>
    <p className="text-gray-600 text-sm mb-6">{message}</p>
    <Link
      to="/"
      className="inline-block bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded transition-colors"
    >
      Về trang chủ
    </Link>
  </div>
);

const LoadingSpinner = () => (
  <svg
    className="animate-spin h-10 w-10 text-brand-600"
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
);

const getErrorMessage = (error: AxiosError<ApiErrorBody>): string => {
  // Backend trả về thông báo tiếng Việt cho INVITE_NOT_FOUND / INVITE_EXPIRED
  return (
    error.response?.data?.message ?? 'Link không hợp lệ hoặc đã hết hạn, vui lòng thử lại'
  );
};

const JoinRoomPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { mutate: joinRoom, isPending, error } = useMutation<
    JoinRoomResult,
    AxiosError<ApiErrorBody>,
    string
  >({
    mutationFn: joinRoomApi,
    onSuccess: (data: JoinRoomResult) => {
      // Success: chuyển thẳng vào phòng
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      navigate(`/rooms/${data.roomId}`, { replace: true });
    },
    onError: (error: AxiosError<ApiErrorBody>) => {
      // 401: access token đã hết hạn -> ra login, giữ returnUrl để sau khi
      // đăng nhập quay lại đúng link join này
      if (error.response?.status === 401) {
        const returnUrl = window.location.pathname + window.location.search;
        navigate('/login', { replace: true, state: { returnUrl } });
      }
    },
  });

  useEffect(() => {
    // Chưa đăng nhập -> ra login, giữ nguyên URL (kèm token) để đăng nhập
    // xong quay lại join
    if (!isAuthenticated) {
      const returnUrl = window.location.pathname + window.location.search;
      navigate('/login', { replace: true, state: { returnUrl } });
      return;
    }

    // Đã đăng nhập -> gọi API join (idempotent: join lần 2 vẫn OK)
    if (token) {
      joinRoom(token);
    }
  }, [isAuthenticated, token, joinRoom, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border text-center">
        {isPending ? (
          <>
            <div className="flex justify-center mb-4">
              <LoadingSpinner />
            </div>
            <p className="text-gray-700 text-lg font-medium">Đang tham gia phòng...</p>
            <p className="text-gray-500 text-sm mt-1">Vui lòng đợi giây lát</p>
          </>
        ) : error ? (
          <JoinError message={getErrorMessage(error)} />
        ) : token === null ? (
          <JoinError message="Link mời không hợp lệ. Vui lòng kiểm tra lại link." />
        ) : (
          // Trạng thái tạm: join thành công, đang chờ navigate
          <>
            <div className="flex justify-center mb-4">
              <LoadingSpinner />
            </div>
            <p className="text-gray-700 text-lg font-medium">Tham gia phòng...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinRoomPage;