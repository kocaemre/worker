import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const main = async () => {
  await prisma.user.createMany({
    data: [
      { email: 'free@example.com', plan: 'free' },
      { email: 'pro@example.com', plan: 'premium', telegramChatId: '123456' },
    ],
  });

  const users = await prisma.user.findMany();
  await prisma.node.createMany({
    data: [
      {
        url: 'https://example.org/health',
        nextCheckAt: new Date(),
        userId: users[0].id,
      },
      {
        url: 'https://example.com',
        method: 'http',
        nextCheckAt: new Date(),
        userId: users[1].id,
      },
      {
        url: 'https://x.com/name=',
        method: 'api',
        keyword: 'alice',
        nextCheckAt: new Date(),
        userId: users[1].id,
      },
    ],
  });
};

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  }); 