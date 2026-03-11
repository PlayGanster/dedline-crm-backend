import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding performer notes...');

  // Получаем всех исполнителей
  const performers = await prisma.performer.findMany({
    where: { is_active: true },
  });

  console.log(`📊 Found ${performers.length} active performers`);

  // Очищаем старые заметки
  await prisma.performerNote.deleteMany();
  console.log('🗑️  Cleared existing notes');

  // Тестовые заметки для каждого исполнителя
  const notesByIndex: Record<number, string[]> = {
    0: [
      'Вежливо общается с клиентами. Всегда пунктуален.',
      'Рекомендуется для сложных объектов. Работает качественно.',
      'Предупреждать за день до выхода. Любит переработки.',
    ],
    1: [
      'Хороший специалист. Был случай опоздания на 30 минут.',
      'Клиенты довольны работой. Просили закрепить за ним объект.',
    ],
    2: [
      'Новый исполнитель. Прошёл проверку службы безопасности.',
      'Требуется инструктаж по работе с премиум клиентами.',
    ],
    3: [
      'Опытный работник. Есть жалобы на качество от одного клиента.',
      'После разбора ситуации претензии сняты. Продолжает работать.',
    ],
  };

  // Создаём заметки
  let totalNotes = 0;
  for (let i = 0; i < performers.length; i++) {
    const performer = performers[i];
    const notes = notesByIndex[i] || [];

    // Получаем первого менеджера для автора заметок
    const manager = await prisma.user.findFirst({
      where: { role: 'MANAGER' },
    });

    if (!manager) {
      console.warn(`⚠️  No manager found for performer ${performer.id}`);
      continue;
    }

    for (const content of notes) {
      await prisma.performerNote.create({
        data: {
          performerId: performer.id,
          userId: manager.id,
          content,
        },
      });
      totalNotes++;
    }

    console.log(`✅ Created ${notes.length} notes for performer ${performer.id} (${performer.last_name} ${performer.first_name})`);
  }

  console.log('✅ Seeding performer notes finished!');
  console.log(`📊 Total: ${totalNotes} notes for ${performers.length} performers`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding performer notes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
