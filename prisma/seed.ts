import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Hash password
  const hashedPassword = await bcrypt.hash('admin12345678', 10);

  // Create admin user with secret_code
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dedline.crm' },
    update: { secret_code: '123456' },
    create: {
      email: 'admin@dedline.crm',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'DIRECTOR',
      avatar: null,
      is_active: true,
      secret_code: '123456',
    },
  });

  console.log('Created user:', admin);
  console.log('Email:', admin.email);
  console.log('Password: admin12345678');
  console.log('Secret code: 123456');
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
