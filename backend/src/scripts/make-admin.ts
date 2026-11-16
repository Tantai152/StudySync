/**
 * Cấp quyền ADMIN cho một user theo email.
 *
 * Cách dùng (chạy trong thư mục backend):
 *   npx tsx src/scripts/make-admin.ts <email>
 */
import { prisma } from '../config/prisma.js';

const email = process.argv[2]?.trim();

const main = async (): Promise<void> => {
  if (!email) {
    throw new Error(
      'Thiếu tham số email. Ví dụ: npx tsx src/scripts/make-admin.ts user@example.com'
    );
  }

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!target) {
    throw new Error(`Không tìm thấy user với email "${email}"`);
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { role: 'ADMIN' },
    select: { id: true, email: true, role: true },
  });

  console.log(
    `Đã cấp quyền ADMIN cho ${user.email} (${user.id}), role hiện tại: ${user.role}`
  );
};

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Cấp quyền ADMIN thất bại: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
