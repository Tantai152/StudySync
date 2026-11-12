/**
 * Xem nhanh các đoạn transcription mới nhất trong DB.
 *
 * Cách dùng (chạy trong thư mục backend):
 *   npx tsx scripts/show-transcriptions.ts
 *   npx tsx scripts/show-transcriptions.ts --limit 50
 *   npx tsx scripts/show-transcriptions.ts --room <roomId>
 *
 * Hoặc dùng npm script:
 *   npm run db:transcriptions
 *   npm run db:transcriptions -- --limit 50 --room <roomId>
 */
import { prisma } from '../src/config/prisma.js';

const args = process.argv.slice(2);

const readArg = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const limitArg = Number(readArg('--limit') ?? 20);
const limit = Number.isInteger(limitArg) && limitArg > 0 ? Math.min(limitArg, 200) : 20;
const roomId = readArg('--room');

const rows = await prisma.transcription.findMany({
  where: roomId ? { roomId } : undefined,
  orderBy: { createdAt: 'desc' },
  take: limit,
  include: {
    room: { select: { name: true } },
    user: { select: { name: true, email: true } },
  },
});

if (rows.length === 0) {
  console.log(
    roomId
      ? `Chưa có transcription nào cho room ${roomId}.`
      : 'Chưa có transcription nào trong DB.'
  );
} else {
  const total = await prisma.transcription.count({
    where: roomId ? { roomId } : undefined,
  });

  console.log(
    `Hiển thị ${rows.length}/${total} transcription mới nhất` +
      (roomId ? ` (room ${roomId})` : '') +
      '\n'
  );

  rows.forEach((row, index) => {
    const time = row.createdAt.toLocaleString('vi-VN');
    console.log(
      `${index + 1}. [${time}] phòng "${row.room.name}" | ${row.user.name} <${row.user.email}>`
    );
    console.log(`   ${row.text}\n`);
  });
}

await prisma.$disconnect();
