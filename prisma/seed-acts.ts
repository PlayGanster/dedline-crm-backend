import { PrismaClient, ActStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding acts...');

  const clients = await prisma.client.findMany({ take: 4 });
  const invoices = await prisma.invoice.findMany({ take: 3 });
  const applications = await prisma.application.findMany({ take: 3 });

  if (clients.length < 3) {
    console.log('❌ Недостаточно клиентов для создания актов');
    return;
  }

  await prisma.act.deleteMany();
  console.log('🗑️  Cleared existing acts');

  const today = new Date();
  
  const actsData = [
    {
      number: `ACT-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0001`,
      amount: '45000.00',
      status: ActStatus.SIGNED,
      client_index: 0,
      invoice_index: 0,
      application_index: 0,
      description: 'Акт выполненных работ по монтажу электропроводки',
      items: [{ description: 'Монтаж электропроводки', quantity: 1, unit_price: 45000, total: 45000 }],
    },
    {
      number: `ACT-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0002`,
      amount: '25000.00',
      status: ActStatus.SENT,
      client_index: 1,
      invoice_index: 1,
      application_index: 1,
      description: 'Акт выполненных работ по установке сантехники',
      items: [{ description: 'Установка сантехники', quantity: 1, unit_price: 25000, total: 25000 }],
    },
    {
      number: `ACT-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0003`,
      amount: '80000.00',
      status: ActStatus.DRAFT,
      client_index: 2,
      invoice_index: 2,
      application_index: 2,
      description: 'Акт выполненных сварочных работ',
      items: [
        { description: 'Сварка каркаса', quantity: 50, unit_price: 1000, total: 50000 },
        { description: 'Грунтовка металла', quantity: 30, unit_price: 500, total: 15000 },
        { description: 'Монтаж на месте', quantity: 1, unit_price: 15000, total: 15000 },
      ],
    },
    {
      number: `ACT-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-0004`,
      amount: '15000.00',
      status: ActStatus.CANCELLED,
      client_index: 0,
      invoice_index: null,
      application_index: null,
      description: 'Акт консультационных услуг (отменён)',
      items: [{ description: 'Консультация', quantity: 3, unit_price: 5000, total: 15000 }],
    },
  ];

  for (const actData of actsData) {
    const { client_index, invoice_index, application_index, items, ...data } = actData;

    const act = await prisma.act.create({
      data: {
        ...data,
        client_id: clients[client_index].id,
        invoice_id: invoice_index !== null ? invoices[invoice_index]?.id : null,
        application_id: application_index !== null ? applications[application_index]?.id : null,
        items: JSON.stringify(items),
      },
    });

    console.log(`✅ Created act: ${act.number} - ${act.amount}₽ (${act.status})`);
  }

  console.log('✅ Seeding acts finished!');
  console.log(`📊 Total: ${actsData.length} acts`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding acts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
