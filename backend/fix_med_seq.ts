import prisma from './src/config/database';

async function main() {
  console.log('Fixing medicamento sequence...');
  await prisma.$executeRaw`SELECT setval('"medicamento_codigo_seq"', (SELECT MAX(codigo) FROM "medicamento"));`;
  
  console.log('Fixing stock sequence...');
  await prisma.$executeRaw`SELECT setval('"stock_item_seq"', (SELECT MAX(item) FROM "stock"));`;

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
