import { prisma } from '../config/prisma.js';

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string;
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  const data: { name?: string; avatarUrl?: string | null } = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }

  if (input.avatarUrl !== undefined) {
    const avatarUrl = input.avatarUrl.trim();
    data.avatarUrl = avatarUrl === '' ? null : avatarUrl;
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
