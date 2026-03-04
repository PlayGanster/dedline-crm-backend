import { PrismaClient, SourceType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Простая функция шифрования для тестов (в production используется CryptoService)
function simpleEncrypt(text: string): string {
  // Base64 encoding для симуляции шифрования
  return Buffer.from(text, 'utf-8').toString('base64');
}

async function main() {
  console.log('🌱 Start seeding performers...');

  // APP пользователи (с паролем)
  const appPerformers = [
    {
      email: 'performer1@app.com',
      phone: '+7 (999) 111-22-33',
      first_name: 'Алексей',
      last_name: 'Смирнов',
      middle_name: 'Иванович',
      source: SourceType.APP,
      password: await bcrypt.hash('performer123', 10),
      professions: ['Электрик', 'Сантехник'],
      passport_series: '4501',
      passport_number: '567890',
    },
    {
      email: 'performer2@app.com',
      phone: '+7 (999) 222-33-44',
      first_name: 'Дмитрий',
      last_name: 'Кузнецов',
      middle_name: 'Петрович',
      source: SourceType.APP,
      password: await bcrypt.hash('performer456', 10),
      professions: ['Плотник', 'Маляр'],
      passport_series: '4502',
      passport_number: '678901',
    },
  ];

  // CRM пользователи (без пароля)
  const crmPerformers = [
    {
      email: 'performer3@crm.com',
      phone: '+7 (999) 333-44-55',
      first_name: 'Иван',
      last_name: 'Попов',
      middle_name: 'Сергеевич',
      source: SourceType.CRM,
      password: null,
      professions: ['Сварщик'],
      passport_series: '4503',
      passport_number: '789012',
    },
    {
      email: 'performer4@crm.com',
      phone: '+7 (999) 444-55-66',
      first_name: 'Сергей',
      last_name: 'Васильев',
      middle_name: 'Александрович',
      source: SourceType.CRM,
      password: null,
      professions: ['Кровельщик', 'Фасадчик'],
      passport_series: '4504',
      passport_number: '890123',
    },
  ];

  // Очищаем базу перед добавлением
  await prisma.performerDocument.deleteMany();
  await prisma.performerNote.deleteMany();
  await prisma.performerProfession.deleteMany();
  await prisma.performerEncryptedData.deleteMany();
  await prisma.performer.deleteMany();
  console.log('🗑️  Cleared existing performers');

  // Вставляем APP пользователей
  for (const perfData of appPerformers) {
    const { professions, passport_series, passport_number, ...data } = perfData;
    
    const performer = await prisma.performer.create({ data });
    
    // Создаём профессии
    for (const profName of professions) {
      await prisma.performerProfession.create({
        data: { performerId: performer.id, name: profName },
      });
    }
    
    // Сохраняем зашифрованные паспортные данные
    await prisma.performerEncryptedData.create({
      data: { performerId: performer.id, fieldType: 'passport_series', encryptedValue: simpleEncrypt(passport_series) },
    });
    await prisma.performerEncryptedData.create({
      data: { performerId: performer.id, fieldType: 'passport_number', encryptedValue: simpleEncrypt(passport_number) },
    });
    
    console.log(`✅ Created APP performer: ${performer.last_name} ${performer.first_name} (password: performer123)`);
  }

  // Вставляем CRM пользователей
  for (const perfData of crmPerformers) {
    const { professions, passport_series, passport_number, ...data } = perfData;
    
    const performer = await prisma.performer.create({ data });
    
    // Создаём профессии
    for (const profName of professions) {
      await prisma.performerProfession.create({
        data: { performerId: performer.id, name: profName },
      });
    }
    
    // Сохраняем зашифрованные паспортные данные
    await prisma.performerEncryptedData.create({
      data: { performerId: performer.id, fieldType: 'passport_series', encryptedValue: simpleEncrypt(passport_series) },
    });
    await prisma.performerEncryptedData.create({
      data: { performerId: performer.id, fieldType: 'passport_number', encryptedValue: simpleEncrypt(passport_number) },
    });
    
    console.log(`✅ Created CRM performer: ${performer.last_name} ${performer.first_name}`);
  }

  console.log('✅ Seeding performers finished!');
  console.log('📊 Total: 4 performers (2 APP + 2 CRM)');
  console.log('\n📝 APP Login credentials:');
  console.log('   performer1@app.com / performer123');
  console.log('   performer2@app.com / performer456');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding performers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
