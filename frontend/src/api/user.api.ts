import api from '../lib/axios';
import type { UpdateProfileInput, User } from '../types/auth.types';

export const updateProfileApi = async (data: UpdateProfileInput): Promise<User> => {
  const response = await api.patch('/users/profile', data);
  return response.data.data.user as User;
};
