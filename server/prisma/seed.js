import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  // Create test users
  const user1 = await prisma.user.create({
    data: {
      email: 'free@example.com',
      name: 'Free User',
      subscriptionStatus: 'free',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'pro@example.com', 
      name: 'Premium User',
      subscriptionStatus: 'premium',
      telegramChatId: '123456',
      notificationEmail: 'alerts@example.com'
    },
  });

  // Create blockchain projects
  const ethProject = await prisma.blockchainProject.create({
    data: {
      name: 'ethereum',
      displayName: 'Ethereum Mainnet',
      description: 'Ethereum blockchain monitoring',
      validationMethod: 'jsonRpc',
      validationUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      userInputType: 'text',
      userInputLabel: 'RPC Endpoint',
    },
  });

  const avalProject = await prisma.blockchainProject.create({
    data: {
      name: 'avail',
      displayName: 'Avail Network',
      description: 'Avail data availability monitoring',
      validationMethod: 'api',
      validationUrl: 'https://api.avail.tools/v1/validator/',
      userInputType: 'wallet',
      userInputLabel: 'Validator Address',
    },
  });

  // Create test nodes
  await prisma.node.createMany({
    data: [
      {
        userId: user1.id,
        blockchainProjectId: ethProject.id,
        name: 'My Ethereum Node',
        nodeConfig: JSON.stringify({ rpc_endpoint: 'https://eth-mainnet.g.alchemy.com/v2/demo' }),
        status: 'healthy',
      },
      {
        userId: user2.id,
        blockchainProjectId: ethProject.id,
        name: 'Premium ETH Node',
        nodeConfig: JSON.stringify({ rpc_endpoint: 'https://rpc.ankr.com/eth' }),
        status: 'unknown',
      },
      {
        userId: user2.id,
        blockchainProjectId: avalProject.id,
        name: 'Avail Validator',
        nodeConfig: JSON.stringify({ validator_address: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY' }),
        status: 'unhealthy',
        lastError: 'Validator not found',
      },
    ],
  });

  console.log('✅ Seed data created successfully!');
  console.log('👤 Users: free@example.com (free), pro@example.com (premium)');
  console.log('🔗 Projects: Ethereum, Avail Network');
  console.log('🖥️ Nodes: 3 test nodes created');
};

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  }); 