export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateProfile: (data: UpdateProfileInput) => Promise<void>;
}
