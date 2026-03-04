import { PrismaClient, ClientType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding clients...');

  // Физ. лица
  const individualClients = [
    {
      type: ClientType.INDIVIDUAL,
      first_name: 'Иван',
      last_name: 'Иванов',
      middle_name: 'Иванович',
      email: 'ivanov@example.com',
      phone: '+7 (999) 111-11-11',
      passport_series: '4501',
      passport_number: '123456',
      notes: 'Постоянный клиент',
      is_active: true,
    },
    {
      type: ClientType.INDIVIDUAL,
      first_name: 'Петр',
      last_name: 'Петров',
      middle_name: 'Петрович',
      email: 'petrov@example.com',
      phone: '+7 (999) 222-22-22',
      passport_series: '4502',
      passport_number: '234567',
      notes: '',
      is_active: true,
    },
    {
      type: ClientType.INDIVIDUAL,
      first_name: 'Анна',
      last_name: 'Сидорова',
      middle_name: 'Александровна',
      email: 'sidorova@example.com',
      phone: '+7 (999) 333-33-33',
      passport_series: '4503',
      passport_number: '345678',
      notes: 'VIP клиент',
      is_active: true,
    },
  ];

  // Юр. лица
  const legalEntityClients = [
    {
      type: ClientType.LEGAL_ENTITY,
      company_name: 'ООО "Ромашка"',
      email: 'info@romashka.ru',
      phone: '+7 (495) 111-22-33',
      inn: '7701234567',
      kpp: '770101001',
      ogrn: '1027700123456',
      legal_address: '123456, г. Москва, ул. Ленина, д. 1',
      notes: 'Крупный клиент',
      is_active: true,
    },
    {
      type: ClientType.LEGAL_ENTITY,
      company_name: 'АО "Вектор"',
      email: 'contact@vector.ru',
      phone: '+7 (495) 222-33-44',
      inn: '7702345678',
      kpp: '770201001',
      ogrn: '1027700234567',
      legal_address: '123457, г. Москва, ул. Мира, д. 10',
      notes: '',
      is_active: true,
    },
    {
      type: ClientType.LEGAL_ENTITY,
      company_name: 'ИП Смирнов А.А.',
      email: 'smirnov@business.ru',
      phone: '+7 (999) 444-55-66',
      inn: '770301234567',
      kpp: '',
      ogrn: '304770001234567',
      legal_address: '123458, г. Москва, пр-т Мира, д. 50',
      notes: 'Индивидуальный предприниматель',
      is_active: true,
    },
    {
      type: ClientType.LEGAL_ENTITY,
      company_name: 'ООО "ТехноСтрой"',
      email: 'info@technostroy.ru',
      phone: '+7 (812) 555-66-77',
      inn: '7801234567',
      kpp: '780101001',
      ogrn: '1027800123456',
      legal_address: '190000, г. Санкт-Петербург, Невский пр., д. 100',
      notes: 'Строительная компания',
      is_active: false,
    },
  ];

  // Очищаем базу перед добавлением
  await prisma.client.deleteMany();
  console.log('🗑️  Cleared existing clients');

  // Вставляем физ. лица
  for (const clientData of individualClients) {
    const client = await prisma.client.create({
      data: clientData,
    });
    console.log(`✅ Created individual client: ${client.last_name} ${client.first_name}`);
  }

  // Вставляем юр. лица
  for (const clientData of legalEntityClients) {
    const client = await prisma.client.create({
      data: clientData,
    });
    console.log(`✅ Created legal entity client: ${client.company_name}`);
  }

  console.log('✅ Seeding clients finished!');
  console.log(`📊 Total: ${individualClients.length + legalEntityClients.length} clients`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding clients:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
