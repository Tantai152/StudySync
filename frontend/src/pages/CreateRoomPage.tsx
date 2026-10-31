import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createRoomApi, CreateRoomData } from '../api/room.api';
import { AxiosError } from 'axios';

interface ErrorResponse {
  message: string;
}

const CreateRoomPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const mutation = useMutation({
    mutationFn: createRoomApi,
    onSuccess: (data) => {
      alert('Tạo phòng thành công!');
      navigate(`/rooms/${data.id}`); // Chuyển hướng vào thẳng phòng vừa tạo
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      setErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra khi tạo phòng');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!name.trim()) {
      setErrorMsg('Tên phòng không được để trống');
      return;
    }

    const data: CreateRoomData = { name, description };
    mutation.mutate(data);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Tạo Phòng Học Mới</h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên phòng <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Phòng Học Toán"
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mô tả (Tùy chọn)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mục tiêu của phòng..."
            rows={3}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
        >
          {mutation.isPending ? 'Đang tạo...' : 'Tạo Phòng'}
        </button>
      </form>
    </div>
  );
};

export default CreateRoomPage;