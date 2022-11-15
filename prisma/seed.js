const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const userData = [
  {
    email: 'willmiao@gmail.com',
    name: 'Will Miao',
    password: 'password',
    bio: "I'm super man",
    articles: {
      create: [
        {
          title: 'how to walk a cat',
          description: 'show you how to walk a cat',
          content: 'cat is cute',
          tags: {
            create: [
              {
                name: 'nodejs',
              },
            ],
          },
        },
      ],
    },
  },
  {
    email: 'alice@gmail.com',
    name: 'alice',
    password: 'password',
    bio: 'a is for alice',
    articles: {
      create: [
        {
          title: 'keep learning',
          description: 'happy learing',
          content: 'happy codding',
          tags: {
            create: [
              {
                name: 'nextjs',
              },
              {
                name: 'expressjs',
              },
              {
                name: 'react',
              },
            ],
          },
        },
      ],
    },
  },
];

async function main() {
  console.log('Start seeding ...');
  for (const u of userData) {
    const user = await prisma.user.create({ data: u });
    console.log(`Created user with id: ${user.id}`);
  }
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
