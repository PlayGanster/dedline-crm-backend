import { PrismaClient, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding applications...');

  // Получаем существующих клиентов и исполнителей
  const clients = await prisma.client.findMany({ take: 5 });
  const performers = await prisma.performer.findMany({ take: 5 });

  if (clients.length === 0 || performers.length === 0) {
    console.log('❌ Нет клиентов или исполнителей для создания заявок');
    return;
  }

  // Очищаем старые заявки
  await prisma.applicationPerformer.deleteMany();
  await prisma.application.deleteMany();
  console.log('🗑️  Cleared existing applications');

  // Тестовые заявки
  const applicationsData = [
    {
      title: 'Монтаж электропроводки в офисе',
      description: 'Необходимо провести полную замену электропроводки в офисном помещении 50 кв.м.\n\nТребования:\n- Демонтаж старой проводки\n- Прокладка новых кабелей\n- Установка розеток и выключателей\n- Сборка электрощита',
      status: ApplicationStatus.IN_PROGRESS,
      amount: '45000',
      performers_count: 2,
      client_index: 0,
      performer_indices: [0, 1],
    },
    {
      title: 'Установка сантехники в ванной',
      description: 'Монтаж сантехнического оборудования в новой ванной комнате.\n\nРаботы:\n- Установка ванны\n- Подключение раковины\n- Монтаж унитаза\n- Установка смесителей',
      status: ApplicationStatus.NEW,
      amount: '25000',
      performers_count: 1,
      client_index: 1,
      performer_indices: [1],
    },
    {
      title: 'Сварка металлических конструкций',
      description: 'Изготовление и монтаж металлического каркаса для склада.\n\nОбъём работ:\n- Сварка каркаса 10x5м\n- Грунтовка металла\n- Монтаж на месте',
      status: ApplicationStatus.COMPLETED,
      amount: '80000',
      performers_count: 2,
      client_index: 2,
      performer_indices: [2],
    },
    {
      title: 'Покраска стен в квартире',
      description: 'Косметический ремонт - покраска стен в 3-х комнатной квартире.\n\nДетали:\n- Подготовка поверхностей\n- Грунтовка\n- Покраска в 2 слоя\n- Площадь ~120 кв.м',
      status: ApplicationStatus.IN_PROGRESS,
      amount: '35000',
      performers_count: 1,
      client_index: 0,
      performer_indices: [3],
    },
    {
      title: 'Кровельные работы на даче',
      description: 'Ремонт кровли дачного дома.\n\nНеобходимо:\n- Демонтаж старого покрытия\n- Замена обрешётки\n- Укладка металлочерепицы\n- Монтаж водостоков',
      status: ApplicationStatus.CANCELLED,
      amount: '120000',
      performers_count: 3,
      client_index: 3,
      performer_indices: [0, 2, 4],
    },
    {
      title: 'Укладка ламината',
      description: 'Укладка ламината в гостиной и спальне.\n\nПлощадь: 45 кв.м\n\nВключает:\n- Выравнивание пола\n- Укладка подложки\n- Монтаж ламината\n- Установка плинтусов',
      status: ApplicationStatus.NEW,
      amount: '28000',
      performers_count: 1,
      client_index: 1,
      performer_indices: [3],
    },
  ];

  for (const appData of applicationsData) {
    const { client_index, performer_indices, ...data } = appData;
    
    const client = clients[client_index];
    if (!client) continue;

    const application = await prisma.application.create({
      data: {
        ...data,
        client_id: client.id,
      },
    });

    // Добавляем исполнителей
    for (const performerIndex of performer_indices) {
      const performer = performers[performerIndex];
      if (performer) {
        await prisma.applicationPerformer.create({
          data: {
            applicationId: application.id,
            performerId: performer.id,
          },
        });
      }
    }

    console.log(`✅ Created application: "${application.title}" (${application.status})`);
  }

  console.log('✅ Seeding applications finished!');
  console.log(`📊 Total: ${applicationsData.length} applications`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding applications:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
