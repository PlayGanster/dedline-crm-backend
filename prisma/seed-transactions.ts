import { PrismaClient, TransactionType, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding transactions...');

  const clients = await prisma.client.findMany({ take: 3 });
  const performers = await prisma.performer.findMany({ take: 3 });
  const applications = await prisma.application.findMany({ take: 3 });

  if (clients.length === 0) {
    console.log('❌ Нет клиентов для создания транзакций');
    return;
  }

  await prisma.transaction.deleteMany();
  console.log('🗑️  Cleared existing transactions');

  const transactionsData = [
    {
      type: TransactionType.INCOME,
      amount: '45000.00',
      status: TransactionStatus.COMPLETED,
      description: 'Оплата за монтаж электропроводки',
      client_index: 0,
      performer_index: null,
      application_index: 0,
      date_offset: -1,
    },
    {
      type: TransactionType.EXPENSE,
      amount: '15000.00',
      status: TransactionStatus.COMPLETED,
      description: 'Выплата исполнителю за работу',
      client_index: null,
      performer_index: 0,
      application_index: 0,
      date_offset: -1,
    },
    {
      type: TransactionType.INCOME,
      amount: '25000.00',
      status: TransactionStatus.PENDING,
      description: 'Аванс за установку сантехники',
      client_index: 1,
      performer_index: null,
      application_index: 1,
      date_offset: -2,
    },
    {
      type: TransactionType.EXPENSE,
      amount: '8000.00',
      status: TransactionStatus.PENDING,
      description: 'Закупка материалов',
      client_index: null,
      performer_index: null,
      application_index: null,
      date_offset: -3,
    },
    {
      type: TransactionType.INCOME,
      amount: '80000.00',
      status: TransactionStatus.COMPLETED,
      description: 'Оплата за сварочные работы',
      client_index: 2,
      performer_index: null,
      application_index: 2,
      date_offset: -5,
    },
    {
      type: TransactionType.EXPENSE,
      amount: '20000.00',
      status: TransactionStatus.CANCELLED,
      description: 'Отменённая выплата',
      client_index: null,
      performer_index: 1,
      application_index: null,
      date_offset: -7,
    },
  ];

  for (const tData of transactionsData) {
    const { client_index, performer_index, application_index, date_offset, ...data } = tData;

    const transactionDate = new Date();
    transactionDate.setDate(transactionDate.getDate() + date_offset);

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        client_id: client_index !== null ? clients[client_index].id : null,
        performer_id: performer_index !== null ? performers[performer_index].id : null,
        application_id: application_index !== null ? applications[application_index].id : null,
        transaction_date: transactionDate,
      },
    });

    console.log(`✅ Created transaction: ${data.type} ${data.amount}₽ - ${data.status}`);
  }

  console.log('✅ Seeding transactions finished!');
  console.log(`📊 Total: ${transactionsData.length} transactions`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding transactions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
