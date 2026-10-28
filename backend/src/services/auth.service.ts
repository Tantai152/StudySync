import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { generateToken, type JWTPayload } from '../utils/jwt.js';

const SALT_ROUNDS = 12;

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserResponse;
  accessToken: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function registerUser(input: CreateUserInput): Promise<UserResponse> {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AuthError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function loginUser(input: LoginInput): Promise<LoginResponse> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Generic error for both wrong email and wrong password (security)
  if (!user) {
    throw new AuthError('Email or password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AuthError('Email or password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: 'USER', // Hardcoded until DB has role field
  };

  const accessToken = generateToken(payload);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,
  };
}
