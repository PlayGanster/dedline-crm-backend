import { PrismaClient, ClientType, SourceType, ApplicationStatus, TransactionType, TransactionStatus, InvoiceStatus, ActStatus, IncomingCallStatus, RequisiteType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Вспомогательные функции
function getRandomDate(daysBack: number) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date;
}

function getRandomAmount(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // 1. ПОЛЬЗОВАТЕЛИ (5 пользователей)
  // ============================================
  console.log('\n📝 Creating users...');
  
  const hashedPassword = await bcrypt.hash('admin12345678', 10);
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@dedline.crm' },
      update: {},
      create: {
        email: 'admin@dedline.crm',
        password: hashedPassword,
        first_name: 'Админ',
        last_name: 'Пользователь',
        role: 'DIRECTOR',
        phone: '+7 (999) 000-00-01',
        is_active: true,
        secret_code: '123456',
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager1@dedline.crm' },
      update: {},
      create: {
        email: 'manager1@dedline.crm',
        password: hashedPassword,
        first_name: 'Иван',
        last_name: 'Менеджеров',
        role: 'MANAGER',
        phone: '+7 (999) 000-00-02',
        is_active: true,
        secret_code: '223344',
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager2@dedline.crm' },
      update: {},
      create: {
        email: 'manager2@dedline.crm',
        password: hashedPassword,
        first_name: 'Петр',
        last_name: 'Заявкин',
        role: 'MANAGER',
        phone: '+7 (999) 000-00-03',
        is_active: true,
        secret_code: '334455',
      },
    }),
    prisma.user.upsert({
      where: { email: 'accountant@dedline.crm' },
      update: {},
      create: {
        email: 'accountant@dedline.crm',
        password: hashedPassword,
        first_name: 'Елена',
        last_name: 'Бухгалтерова',
        role: 'ACCOUNTANT',
        phone: '+7 (999) 000-00-04',
        is_active: true,
        secret_code: '445566',
      },
    }),
    prisma.user.upsert({
      where: { email: 'chief@dedline.crm' },
      update: {},
      create: {
        email: 'chief@dedline.crm',
        password: hashedPassword,
        first_name: 'Сергей',
        last_name: 'Главный',
        role: 'CHIEF_MANAGER',
        phone: '+7 (999) 000-00-05',
        is_active: true,
        secret_code: '556677',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ============================================
  // 2. КЛИЕНТЫ (5 клиентов: 3 физлица, 2 юрлица)
  // ============================================
  console.log('\n👥 Creating clients...');
  
  const clients = await Promise.all([
    // Физлица
    prisma.client.upsert({
      where: { id: 1 },
      update: {},
      create: {
        type: ClientType.INDIVIDUAL,
        email: 'ivanov@mail.ru',
        phone: '+7 (900) 111-22-33',
        fio: 'Иванов Иван Иванович',
        notes: 'Постоянный клиент, предпочитает связь по телефону',
        is_active: true,
      },
    }),
    prisma.client.upsert({
      where: { id: 2 },
      update: {},
      create: {
        type: ClientType.INDIVIDUAL,
        email: 'petrova@gmail.com',
        phone: '+7 (900) 222-33-44',
        fio: 'Петрова Анна Сергеевна',
        notes: 'Любит подробные отчеты',
        is_active: true,
      },
    }),
    prisma.client.upsert({
      where: { id: 3 },
      update: {},
      create: {
        type: ClientType.INDIVIDUAL,
        email: 'sidorov@yandex.ru',
        phone: '+7 (900) 333-44-55',
        fio: 'Сидоров Дмитрий Алексеевич',
        notes: 'Новый клиент',
        is_active: true,
      },
    }),
    // Юрлица
    prisma.client.upsert({
      where: { id: 4 },
      update: {},
      create: {
        type: ClientType.LEGAL_ENTITY,
        email: 'info@ooo-vector.ru',
        phone: '+7 (495) 111-22-33',
        company_name: 'ООО "Вектор"',
        inn: '7701234567',
        kpp: '770101001',
        ogrn: '1027700123456',
        legal_address: 'г. Москва, ул. Ленина, д. 10, оф. 5',
        notes: 'Крупный заказчик, работаем по договору',
        is_active: true,
      },
    }),
    prisma.client.upsert({
      where: { id: 5 },
      update: {},
      create: {
        type: ClientType.LEGAL_ENTITY,
        email: 'contact@ip-smirnov.ru',
        phone: '+7 (495) 222-33-44',
        company_name: 'ИП Смирнов А.В.',
        inn: '770298765432',
        ogrn: '304770000123456',
        legal_address: 'г. Москва, пр. Мира, д. 25',
        notes: 'Работаем с НДС',
        is_active: true,
      },
    }),
  ]);

  console.log(`✅ Created ${clients.length} clients`);

  // ============================================
  // 3. ИСПОЛНИТЕЛИ (5 исполнителей)
  // ============================================
  console.log('\n👷 Creating performers...');
  
  const performers = await Promise.all([
    prisma.performer.upsert({
      where: { id: 1 },
      update: {},
      create: {
        email: 'volkov@dedline.work',
        password: await bcrypt.hash('performer123', 10),
        phone: '+7 (900) 444-55-66',
        first_name: 'Алексей',
        last_name: 'Волков',
        middle_name: 'Петрович',
        source: SourceType.CRM,
        is_verified: true,
        is_active: true,
      },
    }),
    prisma.performer.upsert({
      where: { id: 2 },
      update: {},
      create: {
        email: 'kozlov@dedline.work',
        password: await bcrypt.hash('performer123', 10),
        phone: '+7 (900) 555-66-77',
        first_name: 'Максим',
        last_name: 'Козлов',
        middle_name: 'Дмитриевич',
        source: SourceType.CRM,
        is_verified: true,
        is_active: true,
      },
    }),
    prisma.performer.upsert({
      where: { id: 3 },
      update: {},
      create: {
        email: 'novikov@dedline.work',
        password: await bcrypt.hash('performer123', 10),
        phone: '+7 (900) 666-77-88',
        first_name: 'Андрей',
        last_name: 'Новиков',
        middle_name: 'Сергеевич',
        source: SourceType.APP,
        is_verified: false,
        is_active: true,
      },
    }),
    prisma.performer.upsert({
      where: { id: 4 },
      update: {},
      create: {
        email: 'morozov@dedline.work',
        password: await bcrypt.hash('performer123', 10),
        phone: '+7 (900) 777-88-99',
        first_name: 'Евгений',
        last_name: 'Морозов',
        middle_name: 'Александрович',
        source: SourceType.CRM,
        is_verified: true,
        is_active: true,
      },
    }),
    prisma.performer.upsert({
      where: { id: 5 },
      update: {},
      create: {
        email: 'lebedev@dedline.work',
        password: await bcrypt.hash('performer123', 10),
        phone: '+7 (900) 888-99-00',
        first_name: 'Владимир',
        last_name: 'Лебедев',
        middle_name: 'Николаевич',
        source: SourceType.APP,
        is_verified: false,
        is_active: true,
      },
    }),
  ]);

  // Добавляем профессии исполнителям
  await prisma.performerProfession.createMany({
    data: [
      { performerId: 1, name: 'Грузчик' },
      { performerId: 1, name: 'Разнорабочий' },
      { performerId: 2, name: 'Строитель' },
      { performerId: 2, name: 'Отделочник' },
      { performerId: 3, name: 'Клинер' },
      { performerId: 4, name: 'Грузчик' },
      { performerId: 4, name: 'Такелажник' },
      { performerId: 5, name: 'Разнорабочий' },
    ],
  });

  console.log(`✅ Created ${performers.length} performers`);

  // ============================================
  // 4. ЗАЯВКИ (5 заявок)
  // ============================================
  console.log('\n📋 Creating applications...');
  
  const applications = await Promise.all([
    prisma.application.upsert({
      where: { id: 1 },
      update: {},
      create: {
        title: 'Переезд офиса',
        description: 'Необходимо организовать переезд офиса из 50 рабочих мест',
        client_id: 4, // ООО "Вектор"
        status: ApplicationStatus.IN_PROGRESS,
        amount: 150000,
        performers_count: 4,
        city: 'Москва',
        manager_id: users[0].id, // admin
        director_id: users[0].id,
        manager_comment: 'Срочная заявка, клиент важный',
      },
    }),
    prisma.application.upsert({
      where: { id: 2 },
      update: {},
      create: {
        title: 'Уборка после ремонта',
        description: 'Клининговые услуги после косметического ремонта квартиры',
        client_id: 1, // Иванов
        status: ApplicationStatus.COMPLETED,
        amount: 25000,
        performers_count: 2,
        city: 'Москва',
        manager_id: users[1].id, // manager1
        director_id: users[4].id, // chief
        manager_comment: 'Клиент доволен',
      },
    }),
    prisma.application.upsert({
      where: { id: 3 },
      update: {},
      create: {
        title: 'Погрузочные работы',
        description: 'Погрузка строительного оборудования на складе',
        client_id: 5, // ИП Смирнов
        status: ApplicationStatus.NEW,
        amount: 45000,
        performers_count: 3,
        city: 'Химки',
        manager_id: users[2].id, // manager2
        manager_comment: 'Нужны крепкие грузчики',
      },
    }),
    prisma.application.upsert({
      where: { id: 4 },
      update: {},
      create: {
        title: 'Демонтаж перегородок',
        description: 'Демонтаж гипсокартонных перегородок в торговом центре',
        client_id: 2, // Петрова
        status: ApplicationStatus.IN_PROGRESS,
        amount: 80000,
        performers_count: 5,
        city: 'Москва',
        manager_id: users[1].id,
        director_id: users[0].id,
        manager_comment: 'Работа в ночное время',
      },
    }),
    prisma.application.upsert({
      where: { id: 5 },
      update: {},
      create: {
        title: 'Вывоз строительного мусора',
        description: 'Вывоз и утилизация строительного мусора после демонтажа',
        client_id: 3, // Сидоров
        status: ApplicationStatus.CANCELLED,
        amount: 30000,
        performers_count: 2,
        city: 'Подольск',
        manager_id: users[2].id,
        manager_comment: 'Клиент отменил',
      },
    }),
  ]);

  // Добавляем исполнителей к заявкам
  await prisma.applicationPerformer.createMany({
    data: [
      { applicationId: 1, performerId: 1 },
      { applicationId: 1, performerId: 2 },
      { applicationId: 1, performerId: 4 },
      { applicationId: 2, performerId: 3 },
      { applicationId: 2, performerId: 5 },
      { applicationId: 3, performerId: 1 },
      { applicationId: 3, performerId: 4 },
      { applicationId: 3, performerId: 5 },
      { applicationId: 4, performerId: 2 },
      { applicationId: 4, performerId: 4 },
    ],
  });

  console.log(`✅ Created ${applications.length} applications`);

  // ============================================
  // 5. ВХОДЯЩИЕ ЗВОНКИ (5 звонков)
  // ============================================
  console.log('\n📞 Creating incoming calls...');
  
  const calls = await Promise.all([
    prisma.incomingCall.upsert({
      where: { id: 1 },
      update: {},
      create: {
        phone: '+7 (900) 111-22-33',
        caller_name: 'Иванов Иван',
        crm_user_id: users[0].id,
        client_id: clients[0].id,
        application_id: applications[0].id,
        duration: 245,
        notes: 'Обсуждали детали переезда',
        status: IncomingCallStatus.ANSWERED,
        created_at: getRandomDate(1),
      },
    }),
    prisma.incomingCall.upsert({
      where: { id: 2 },
      update: {},
      create: {
        phone: '+7 (495) 111-22-33',
        caller_name: 'ООО Вектор',
        crm_user_id: users[1].id,
        client_id: clients[3].id,
        duration: 180,
        notes: 'Запрос на новую заявку',
        status: IncomingCallStatus.ANSWERED,
        created_at: getRandomDate(2),
      },
    }),
    prisma.incomingCall.upsert({
      where: { id: 3 },
      update: {},
      create: {
        phone: '+7 (900) 999-88-77',
        caller_name: 'Неизвестный',
        status: IncomingCallStatus.MISSED,
        created_at: getRandomDate(3),
      },
    }),
    prisma.incomingCall.upsert({
      where: { id: 4 },
      update: {},
      create: {
        phone: '+7 (900) 222-33-44',
        caller_name: 'Петрова Анна',
        crm_user_id: users[2].id,
        client_id: clients[1].id,
        application_id: applications[3].id,
        duration: 320,
        notes: 'Уточнение по графику работ',
        status: IncomingCallStatus.ANSWERED,
        created_at: getRandomDate(4),
      },
    }),
    prisma.incomingCall.upsert({
      where: { id: 5 },
      update: {},
      create: {
        phone: '+7 (900) 333-44-55',
        caller_name: 'Сидоров Дмитрий',
        crm_user_id: users[1].id,
        client_id: clients[2].id,
        duration: 0,
        notes: 'Звонок сброшен',
        status: IncomingCallStatus.MISSED,
        created_at: getRandomDate(5),
      },
    }),
  ]);

  console.log(`✅ Created ${calls.length} incoming calls`);

  // ============================================
  // 6. ТРАНЗАКЦИИ (5 транзакций)
  // ============================================
  console.log('\n💰 Creating transactions...');
  
  const transactions = await Promise.all([
    prisma.transaction.upsert({
      where: { id: 1 },
      update: {},
      create: {
        type: TransactionType.INCOME,
        amount: 150000,
        status: TransactionStatus.COMPLETED,
        description: 'Оплата за переезд офиса',
        client_id: clients[3].id,
        application_id: applications[0].id,
        transaction_date: getRandomDate(5),
      },
    }),
    prisma.transaction.upsert({
      where: { id: 2 },
      update: {},
      create: {
        type: TransactionType.EXPENSE,
        amount: 60000,
        status: TransactionStatus.COMPLETED,
        description: 'Выплата исполнителям (переезд)',
        performer_id: performers[0].id,
        application_id: applications[0].id,
        transaction_date: getRandomDate(4),
      },
    }),
    prisma.transaction.upsert({
      where: { id: 3 },
      update: {},
      create: {
        type: TransactionType.INCOME,
        amount: 25000,
        status: TransactionStatus.COMPLETED,
        description: 'Уборка после ремонта',
        client_id: clients[0].id,
        application_id: applications[1].id,
        transaction_date: getRandomDate(3),
      },
    }),
    prisma.transaction.upsert({
      where: { id: 4 },
      update: {},
      create: {
        type: TransactionType.INCOME,
        amount: 45000,
        status: TransactionStatus.PENDING,
        description: 'Погрузочные работы',
        client_id: clients[4].id,
        application_id: applications[2].id,
        transaction_date: getRandomDate(2),
      },
    }),
    prisma.transaction.upsert({
      where: { id: 5 },
      update: {},
      create: {
        type: TransactionType.EXPENSE,
        amount: 20000,
        status: TransactionStatus.PENDING,
        description: 'Выплата исполнителям (погрузка)',
        performer_id: performers[1].id,
        application_id: applications[2].id,
        transaction_date: getRandomDate(1),
      },
    }),
  ]);

  console.log(`✅ Created ${transactions.length} transactions`);

  // ============================================
  // 7. СЧЕТА (5 счетов)
  // ============================================
  console.log('\n📄 Creating invoices...');
  
  const now = new Date();
  const invoices = await Promise.all([
    prisma.invoice.upsert({
      where: { id: 1 },
      update: {},
      create: {
        number: 'СЧ-001/2026',
        amount: 150000,
        status: InvoiceStatus.PAID,
        client_id: clients[3].id,
        application_id: applications[0].id,
        issue_date: getRandomDate(10),
        due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        paid_at: getRandomDate(5),
        description: 'Переезд офиса',
        notes: 'Оплачено полностью',
      },
    }),
    prisma.invoice.upsert({
      where: { id: 2 },
      update: {},
      create: {
        number: 'СЧ-002/2026',
        amount: 25000,
        status: InvoiceStatus.PAID,
        client_id: clients[0].id,
        application_id: applications[1].id,
        issue_date: getRandomDate(8),
        due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        paid_at: getRandomDate(3),
        description: 'Клининговые услуги',
      },
    }),
    prisma.invoice.upsert({
      where: { id: 3 },
      update: {},
      create: {
        number: 'СЧ-003/2026',
        amount: 45000,
        status: InvoiceStatus.SENT,
        client_id: clients[4].id,
        application_id: applications[2].id,
        issue_date: getRandomDate(5),
        due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        description: 'Погрузочные работы',
      },
    }),
    prisma.invoice.upsert({
      where: { id: 4 },
      update: {},
      create: {
        number: 'СЧ-004/2026',
        amount: 80000,
        status: InvoiceStatus.SENT,
        client_id: clients[1].id,
        application_id: applications[3].id,
        issue_date: getRandomDate(3),
        due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        description: 'Демонтаж перегородок',
      },
    }),
    prisma.invoice.upsert({
      where: { id: 5 },
      update: {},
      create: {
        number: 'СЧ-005/2026',
        amount: 30000,
        status: InvoiceStatus.CANCELLED,
        client_id: clients[2].id,
        application_id: applications[4].id,
        issue_date: getRandomDate(7),
        due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        description: 'Вывоз мусора (отменено)',
      },
    }),
  ]);

  console.log(`✅ Created ${invoices.length} invoices`);

  // ============================================
  // 8. АКТЫ (5 актов)
  // ============================================
  console.log('\n📑 Creating acts...');
  
  const acts = await Promise.all([
    prisma.act.upsert({
      where: { id: 1 },
      update: {},
      create: {
        number: 'А-001/2026',
        invoice_id: invoices[0].id,
        client_id: clients[3].id,
        application_id: applications[0].id,
        amount: 150000,
        status: ActStatus.SIGNED,
        act_date: getRandomDate(4),
        description: 'Акт выполненных работ - переезд',
        notes: 'Подписано с обеих сторон',
      },
    }),
    prisma.act.upsert({
      where: { id: 2 },
      update: {},
      create: {
        number: 'А-002/2026',
        invoice_id: invoices[1].id,
        client_id: clients[0].id,
        application_id: applications[1].id,
        amount: 25000,
        status: ActStatus.SIGNED,
        act_date: getRandomDate(2),
        description: 'Акт выполненных работ - уборка',
      },
    }),
    prisma.act.upsert({
      where: { id: 3 },
      update: {},
      create: {
        number: 'А-003/2026',
        invoice_id: invoices[2].id,
        client_id: clients[4].id,
        application_id: applications[2].id,
        amount: 45000,
        status: ActStatus.DRAFT,
        act_date: getRandomDate(1),
        description: 'Акт выполненных работ - погрузка',
      },
    }),
    prisma.act.upsert({
      where: { id: 4 },
      update: {},
      create: {
        number: 'А-004/2026',
        invoice_id: invoices[3].id,
        client_id: clients[1].id,
        application_id: applications[3].id,
        amount: 80000,
        status: ActStatus.DRAFT,
        act_date: getRandomDate(1),
        description: 'Акт выполненных работ - демонтаж',
      },
    }),
    prisma.act.upsert({
      where: { id: 5 },
      update: {},
      create: {
        number: 'А-005/2026',
        invoice_id: invoices[4].id,
        client_id: clients[2].id,
        application_id: applications[4].id,
        amount: 30000,
        status: ActStatus.CANCELLED,
        act_date: getRandomDate(5),
        description: 'Акт выполненных работ - вывоз (отменено)',
      },
    }),
  ]);

  console.log(`✅ Created ${acts.length} acts`);

  // ============================================
  // 9. ЗАМЕТКИ (по 2 заметки на клиента и исполнителя)
  // ============================================
  console.log('\n📝 Creating notes...');
  
  await prisma.clientNote.createMany({
    data: [
      { clientId: 1, userId: users[1].id, content: 'Клиент предпочитает общение в мессенджерах' },
      { clientId: 1, userId: users[0].id, content: 'Важный клиент, всегда на связи' },
      { clientId: 2, userId: users[1].id, content: 'Требует подробные отчеты после каждой работы' },
      { clientId: 3, userId: users[2].id, content: 'Новый клиент, нуждается в особом внимании' },
      { clientId: 4, userId: users[0].id, content: 'Крупный заказчик, работаем по договору' },
      { clientId: 4, userId: users[1].id, content: 'Постоянные заказы, минимум раз в месяц' },
      { clientId: 5, userId: users[2].id, content: 'Работают с НДС, нужны все закрывающие документы' },
    ],
  });

  await prisma.performerNote.createMany({
    data: [
      { performerId: 1, userId: users[0].id, content: 'Опытный исполнитель, работает более 2 лет' },
      { performerId: 2, userId: users[1].id, content: 'Специализируется на строительных работах' },
      { performerId: 3, userId: users[2].id, content: 'Новый исполнитель, требует контроля' },
      { performerId: 4, userId: users[0].id, content: 'Отличный такелажник, работает с дорогим оборудованием' },
      { performerId: 5, userId: users[1].id, content: 'Студент, доступен по вечерам и выходным' },
    ],
  });

  console.log('✅ Created notes');

  // ============================================
  // 10. ЧАТЫ И СООБЩЕНИЯ
  // ============================================
  console.log('\n💬 Creating chats and messages...');
  
  const chats = await Promise.all([
    prisma.chat.upsert({
      where: { id: 1 },
      update: {},
      create: {
        user1_id: users[0].id,
        user2_id: users[1].id,
        name: null,
      },
    }),
    prisma.chat.upsert({
      where: { id: 2 },
      update: {},
      create: {
        user1_id: users[0].id,
        user2_id: users[2].id,
        name: null,
      },
    }),
    prisma.chat.upsert({
      where: { id: 3 },
      update: {},
      create: {
        user1_id: users[1].id,
        user2_id: users[2].id,
        name: null,
      },
    }),
  ]);

  await prisma.message.createMany({
    data: [
      { chat_id: 1, sender_id: users[0].id, content: 'Привет! Как дела с заявкой ООО Вектор?', is_read: true, created_at: getRandomDate(5) },
      { chat_id: 1, sender_id: users[1].id, content: 'Все хорошо, клиент доволен', is_read: true, created_at: getRandomDate(4) },
      { chat_id: 1, sender_id: users[0].id, content: 'Отлично! Держи в курсе', is_read: true, created_at: getRandomDate(3) },
      { chat_id: 2, sender_id: users[2].id, content: 'Нужна помощь с новой заявкой', is_read: true, created_at: getRandomDate(2) },
      { chat_id: 2, sender_id: users[0].id, content: 'Давай, расскажи подробнее', is_read: true, created_at: getRandomDate(1) },
      { chat_id: 3, sender_id: users[1].id, content: 'Петр, ты видел новые заявки?', is_read: false, created_at: getRandomDate(1) },
    ],
  });

  console.log('✅ Created chats and messages');

  // ============================================
  // 11. РЕКВИЗИТЫ ИСПОЛНИТЕЛЕЙ
  // ============================================
  console.log('\n🏦 Creating performer requisites...');
  
  await prisma.performerRequisites.createMany({
    data: [
      {
        performerId: 1,
        type: RequisiteType.CARD,
        name: 'Карта Сбербанк',
        is_default: true,
        card_number: '4276 3800 1234 5678',
        card_holder: 'ALEKSEY VOLKOV',
        bank_name: 'Сбербанк',
      },
      {
        performerId: 2,
        type: RequisiteType.SBP,
        name: 'СБП',
        is_default: true,
        sbp_phone: '+7 (900) 555-66-77',
      },
      {
        performerId: 3,
        type: RequisiteType.CARD,
        name: 'Карта Тинькофф',
        is_default: true,
        card_number: '5581 1300 9876 5432',
        card_holder: 'ANDREY NOVIKOV',
        bank_name: 'Тинькофф',
      },
      {
        performerId: 4,
        type: RequisiteType.CARD,
        name: 'Карта ВТБ',
        is_default: true,
        card_number: '4272 2900 1111 2222',
        card_holder: 'EVGENIY MOROZOV',
        bank_name: 'ВТБ',
      },
      {
        performerId: 5,
        type: RequisiteType.SBP,
        name: 'СБП',
        is_default: true,
        sbp_phone: '+7 (900) 888-99-00',
      },
    ],
  });

  console.log('✅ Created performer requisites');

  // ============================================
  // ИТОГИ
  // ============================================
  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('   - Users: 5');
  console.log('   - Clients: 5 (3 individuals, 2 legal entities)');
  console.log('   - Performers: 5');
  console.log('   - Applications: 5');
  console.log('   - Incoming Calls: 5');
  console.log('   - Transactions: 5');
  console.log('   - Invoices: 5');
  console.log('   - Acts: 5');
  console.log('   - Chats: 3');
  console.log('   - Messages: 6');
  console.log('\n🔐 Login credentials:');
  console.log('   Email: admin@dedline.crm');
  console.log('   Password: admin12345678');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
