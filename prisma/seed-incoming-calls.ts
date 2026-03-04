import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding incoming calls...');

  // Получаем пользователей CRM и клиентов
  const crmUsers = await prisma.user.findMany({ take: 3 });
  const clients = await prisma.client.findMany({ take: 5 });

  if (crmUsers.length === 0) {
    console.log('❌ Нет пользователей CRM для создания звонков');
    return;
  }

  // Очищаем старые звонки
  await prisma.incomingCall.deleteMany();
  console.log('🗑️  Cleared existing incoming calls');

  // Тестовые входящие звонки
  const callsData = [
    {
      phone: '+7 (999) 111-22-33',
      caller_name: 'Иванов Иван',
      duration: 185,
      notes: 'Интересует монтаж электропроводки',
      status: 'ANSWERED',
      client_index: 0,
      crm_user_index: 0,
    },
    {
      phone: '+7 (999) 222-33-44',
      caller_name: 'Петров Петр',
      duration: 320,
      notes: 'Нужна установка сантехники под ключ',
      status: 'ANSWERED',
      client_index: 1,
      crm_user_index: 1,
    },
    {
      phone: '+7 (999) 333-44-55',
      caller_name: null,
      duration: null,
      notes: 'Не дозвонился, перезвонить',
      status: 'MISSED',
      client_index: null,
      crm_user_index: 0,
    },
    {
      phone: '+7 (999) 444-55-66',
      caller_name: 'Сидоров А.А.',
      duration: 600,
      notes: 'Крупный заказ на сварочные работы',
      status: 'ANSWERED',
      client_index: 2,
      crm_user_index: 2,
    },
    {
      phone: '+7 (999) 555-66-77',
      caller_name: 'Анна',
      duration: 120,
      notes: 'Покраска стен, уточнить метраж',
      status: 'INCOMING',
      client_index: null,
      crm_user_index: 1,
    },
    {
      phone: '+7 (495) 123-45-67',
      caller_name: 'ООО "СтройМастер"',
      duration: 450,
      notes: 'Договорились на встречу',
      status: 'ANSWERED',
      client_index: 3,
      crm_user_index: 0,
    },
  ];

  for (const callData of callsData) {
    const { client_index, crm_user_index, ...data } = callData;
    
    const client = client_index !== null ? clients[client_index] : null;
    const crmUser = crmUsers[crm_user_index];

    const call = await prisma.incomingCall.create({
      data: {
        ...data,
        client_id: client?.id || null,
        crm_user_id: crmUser?.id || null,
      } as any,
      include: {
        client: true,
        crm_user: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    console.log(`✅ Created call: ${call.phone} (${call.duration}s) - ${call.status}`);
  }

  console.log('✅ Seeding incoming calls finished!');
  console.log(`📊 Total: ${callsData.length} incoming calls`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding incoming calls:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
