import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const performers = await prisma.performer.findMany({
    select: {
      id: true,
      first_name: true,
      last_name: true,
      is_verified: true,
      is_active: true,
    },
  });

  console.log('Performers:');
  performers.forEach(p => {
    console.log(`  ${p.id}: ${p.last_name} ${p.first_name} - verified: ${p.is_verified}, active: ${p.is_active}`);
  });

  const notes = await prisma.performerNote.findMany({
    include: {
      performer: { select: { id: true, first_name: true, last_name: true } },
      user: { select: { first_name: true, last_name: true } },
    },
  });

  console.log('\nNotes:');
  notes.forEach(n => {
    console.log(`  [${n.performer.last_name} ${n.performer.first_name}] ${n.content} (by ${n.user.first_name} ${n.user.last_name})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
