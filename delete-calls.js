const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Удаляем все звонки
    const result = await prisma.incomingCall.deleteMany({});
    console.log(`✅ Удалено звонков: ${result.count}`);
    
    // Проверяем сколько осталось
    const count = await prisma.incomingCall.count();
    console.log(`📊 Осталось звонков в базе: ${count}`);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
