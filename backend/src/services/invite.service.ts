import crypto from 'crypto';
import { prisma } from '../config/prisma.js';

export const generateInviteLink = async (roomId: string, ownerId: string) => {
  // 1. Kiểm tra xem phòng có tồn tại và user có phải chủ phòng không
  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!room) throw new Error('Phòng không tồn tại');
  if (room.ownerId !== ownerId) throw new Error('Chỉ chủ phòng mới có quyền tạo link mời');

  // 2. Tạo token ngẫu nhiên bảo mật (32 bytes = 64 ký tự hex)
  const rawToken = crypto.randomBytes(32).toString('hex');
  
  // 3. Băm token để lưu vào DB (giống như lưu mật khẩu)
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 4. Hạn sử dụng: 24 giờ
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // 5. Lưu vào DB
  await prisma.invite.create({
    data: {
      roomId,
      tokenHash,
      expiresAt,
    },
  });

  // 6. Trả về token gốc cho Client
  return { token: rawToken, expiresAt };
};