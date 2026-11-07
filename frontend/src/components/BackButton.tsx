import { useLocation, useNavigate } from 'react-router-dom';

interface BackButtonProps {
  /** Fallback khi không có trang trước trong lịch sử trình duyệt. */
  fallbackTo?: string;
  label?: string;
  className?: string;
}

export const BackButton = ({
  fallbackTo = '/',
  label = 'Quay lại',
  className = '',
}: BackButtonProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    // location.key === 'default' nghĩa là trang được mở trực tiếp,
    // không có entry trước đó để navigate(-1).
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }

    navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors ${className}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
        />
      </svg>
      {label}
    </button>
  );
};
