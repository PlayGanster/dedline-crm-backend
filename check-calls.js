const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  const count = await prisma.incomingCall.count();
  console.log(`Звонков в базе: ${count}`);
  
  const calls = await prisma.incomingCall.findMany({ 
    take: 3, 
    orderBy: { created_at: 'desc' },
    include: {
      crm_user: {
        select: { id: true, first_name: true, last_name: true, phone: true }
      }
    }
  });
  
  console.log(JSON.stringify(calls, null, 2));
  
  await prisma.$disconnect();
}

main();
