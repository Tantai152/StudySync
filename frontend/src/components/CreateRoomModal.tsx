import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolverV4 } from '../lib/zodResolver';
import { useMutation } from '@tanstack/react-query';
import { useToast } from './ToastContext';
import { createRoomSchema, type CreateRoomFormData } from '../schemas/room.schema';
import { createRoomApi } from '../api/room.api';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateRoomModal = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateRoomModalProps) => {
  const { show } = useToast();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoomFormData>({
    resolver: zodResolverV4(createRoomSchema),
    mode: 'onBlur',
  });

  const createMutation = useMutation({
    mutationFn: createRoomApi,
    onSuccess: () => {
      reset();
      setApiError(null);
      onClose();
      show('Tạo phòng thành công', 'success');
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || 'Lỗi khi tạo phòng'
          : 'Lỗi khi tạo phòng';
      setApiError(message);
    },
  });

  const onSubmit = (data: CreateRoomFormData) => {
    setApiError(null);
    createMutation.mutate({
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Đóng modal"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Tạo phòng mới
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {apiError}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Tên phòng
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="VD: Phòng học Toán"
              className={`w-full px-4 py-2.5 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Mô tả (tùy chọn)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Mô tả ngắn gọn về phòng..."
              className={`w-full px-4 py-2.5 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors ${
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
