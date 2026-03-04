import { PrismaClient, InvoiceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding invoices...');

  const clients = await prisma.client.findMany({ take: 4 });
  const applications = await prisma.application.findMany({ take: 3 });

  if (clients.length < 3) {
    console.log('❌ Недостаточно клиентов для создания счетов');
    return;
  }

  await prisma.transaction.deleteMany();
  await prisma.invoice.deleteMany();
  console.log('🗑️  Cleared existing invoices and related transactions');

  const today = new Date();
  
  const invoicesData = [
    {
      number: `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0001`,
      amount: '45000.00',
      status: InvoiceStatus.PAID,
      client_index: 0,
      application_index: 0,
      due_date_offset: 30,
      paid_offset: 15,
      description: 'Оплата за монтаж электропроводки',
      items: [{ description: 'Монтаж электропроводки', quantity: 1, unit_price: 45000, total: 45000 }],
    },
    {
      number: `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0002`,
      amount: '25000.00',
      status: InvoiceStatus.SENT,
      client_index: 1,
      application_index: 1,
      due_date_offset: 14,
      paid_offset: null,
      description: 'Аванс за установку сантехники',
      items: [{ description: 'Установка сантехники (аванс 50%)', quantity: 1, unit_price: 25000, total: 25000 }],
    },
    {
      number: `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0003`,
      amount: '80000.00',
      status: InvoiceStatus.OVERDUE,
      client_index: 2,
      application_index: 2,
      due_date_offset: -5,
      paid_offset: null,
      description: 'Сварочные работы',
      items: [
        { description: 'Сварка каркаса', quantity: 50, unit_price: 1000, total: 50000 },
        { description: 'Грунтовка металла', quantity: 30, unit_price: 500, total: 15000 },
        { description: 'Монтаж на месте', quantity: 1, unit_price: 15000, total: 15000 },
      ],
    },
    {
      number: `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0004`,
      amount: '15000.00',
      status: InvoiceStatus.DRAFT,
      client_index: 0,
      application_index: null,
      due_date_offset: 30,
      paid_offset: null,
      description: 'Консультационные услуги',
      items: [{ description: 'Консультация', quantity: 3, unit_price: 5000, total: 15000 }],
    },
    {
      number: `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0005`,
      amount: '120000.00',
      status: InvoiceStatus.CANCELLED,
      client_index: 1,
      application_index: null,
      due_date_offset: 30,
      paid_offset: null,
      description: 'Кровельные работы (отменено)',
      items: [{ description: 'Кровельные работы', quantity: 1, unit_price: 120000, total: 120000 }],
    },
  ];

  for (const invData of invoicesData) {
    const { client_index, application_index, due_date_offset, paid_offset, items, ...data } = invData;

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + due_date_offset);
    
    let paidAt = null;
    if (paid_offset !== null) {
      paidAt = new Date();
      paidAt.setDate(paidAt.getDate() + paid_offset);
    }

    const invoice = await prisma.invoice.create({
      data: {
        ...data,
        client_id: clients[client_index].id,
        application_id: application_index !== null ? applications[application_index].id : null,
        issue_date: issueDate,
        due_date: dueDate,
        paid_at: paidAt,
        items: JSON.stringify(items),
      },
    });

    // Создаём транзакцию для оплаченных счетов
    if (invData.status === InvoiceStatus.PAID) {
      await prisma.transaction.create({
        data: {
          type: 'INCOME',
          amount: invoice.amount,
          status: 'COMPLETED',
          description: `Оплата счёта ${invoice.number}`,
          client_id: clients[client_index].id,
          invoice_id: invoice.id,
          transaction_date: paidAt || issueDate,
        },
      });
    }

    console.log(`✅ Created invoice: ${invoice.number} - ${invoice.amount}₽ (${invoice.status})`);
  }

  console.log('✅ Seeding invoices finished!');
  console.log(`📊 Total: ${invoicesData.length} invoices`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding invoices:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
