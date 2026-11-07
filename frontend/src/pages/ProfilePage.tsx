import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Navbar } from '../components/Navbar';
import { BackButton } from '../components/BackButton';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ToastContext';
import { zodResolverV4 } from '../lib/zodResolver';
import { profileSchema, type ProfileFormData } from '../schemas/profile.schema';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const { show } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolverV4(profileSchema),
    mode: 'onBlur',
    defaultValues: {
      name: user?.name ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  });

  const watchedName = watch('name') || user?.name || '';
  const watchedAvatarUrl = watch('avatarUrl');

  if (!user) {
    return null;
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      reset(data);
      show('Đã cập nhật hồ sơ', 'success');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      show(message || 'Không thể cập nhật hồ sơ. Vui lòng thử lại.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackButton className="mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Trang cá nhân</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <aside className="md:col-span-1 bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center">
            <Avatar
              name={watchedName}
              avatarUrl={watchedAvatarUrl}
              size={120}
              className="ring-4 ring-brand-50"
            />
            <h2 className="mt-5 text-xl font-semibold text-gray-900 break-words">
              {watchedName || 'Chưa có tên'}
            </h2>
            <p className="mt-1 text-sm text-gray-500 break-all">{user.email}</p>
          </aside>

          <section className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Chỉnh sửa thông tin
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Thay đổi tên hiển thị và ảnh đại diện của bạn.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
                  maxLength={50}
                  disabled={isSubmitting}
                  aria-invalid={errors.name ? 'true' : 'false'}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  className={`w-full px-4 py-2.5 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
                    errors.name
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  placeholder="Tên của bạn"
                />
                {errors.name && (
                  <p id="name-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="avatarUrl"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  URL ảnh đại diện
                </label>
                <input
                  {...register('avatarUrl')}
                  id="avatarUrl"
                  type="url"
                  inputMode="url"
                  disabled={isSubmitting}
                  aria-invalid={errors.avatarUrl ? 'true' : 'false'}
                  aria-describedby={
                    errors.avatarUrl ? 'avatarUrl-error' : 'avatarUrl-hint'
                  }
                  className={`w-full px-4 py-2.5 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
                    errors.avatarUrl
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p id="avatarUrl-hint" className="mt-1.5 text-xs text-gray-500">
                  Để trống nếu muốn xóa ảnh và dùng chữ cái đầu của tên.
                </p>
                {errors.avatarUrl && (
                  <p
                    id="avatarUrl-error"
                    className="mt-1.5 text-sm text-red-600"
                    role="alert"
                  >
                    {errors.avatarUrl.message}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
