import crypto from 'crypto';
import { prisma } from '../config/prisma.js';

/**
 * Lỗi nghiệp vụ của module invite.
 * Theo đúng pattern AuthError trong auth.service.ts:
 * controller map `statusCode` + `errorCode` sang envelope REST.
 */
export class InviteError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string,
  ) {
    super(message);
    this.name = 'InviteError';
  }
}

/**
 * Băm token gốc (SHA-256) để lưu/truy vấn trong DB.
 * DB chỉ lưu hash; token gốc chỉ xuất hiện trong URL mời.
 * CẢNH BÁO: mọi chỗ truy vấn theo token đều PHẢI hash bằng helper này
 * để đảm bảo cùng một scheme với lúc tạo invite.
 */
const hashInviteToken = (rawToken: string): string =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

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
  const tokenHash = hashInviteToken(rawToken);

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

export interface JoinRoomResult {
  roomId: string;
  roomName: string;
}

/**
 * Tham gia phòng qua token gắn trong link mời.
 * Idempotent: user đã là thành viên thì không báo lỗi, vẫn trả về thành công.
 */
export const joinRoomByToken = async (
  userId: string,
  rawToken: string,
): Promise<JoinRoomResult> => {
  // 1. Hash token (cùng scheme SHA-256 với lúc tạo invite) rồi mới tra DB
  const tokenHash = hashInviteToken(rawToken);

  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: { room: true },
  });

  // 2. Validate
  if (!invite) {
    throw new InviteError('Link mời không hợp lệ hoặc không tồn tại', 404, 'INVITE_NOT_FOUND');
  }

  if (invite.expiresAt < new Date()) {
    throw new InviteError('Link mời đã hết hạn, vui lòng yêu cầu tạo link mới', 400, 'INVITE_EXPIRED');
  }

  // 3. Thêm user vào phòng. Upsert theo unique (roomId, userId) => idempotent:
  //    user đã là member thì là no-op, không sinh lỗi.
  await prisma.roomMember.upsert({
    where: {
      roomId_userId: {
        roomId: invite.roomId,
        userId,
      },
    },
    update: {},
    create: {
      roomId: invite.roomId,
      userId,
      role: 'MEMBER',
    },
  });

  // 4. Trả về thông tin phòng để frontend chuyển hướng
  return { roomId: invite.roomId, roomName: invite.room.name };
};