import prisma from './src/config/database';

async function main() {
  const rs = await prisma.ingreso_hospitalizacion.findMany();
  console.log(rs);
  
  // Also fix the sequence!
  // In Postgres, if sequence is out of sync, we can reset it.
  try {
    const nextId = (rs.length > 0 ? Math.max(...rs.map(r => r.id_ingreso_hospitalizacion)) : 0) + 1;
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "ingreso_hospitalizacion_id_ingreso_hospitalizacion_seq" RESTART WITH ${nextId};`);
    console.log("Sequence restarted at", nextId);
  } catch(e) {
    console.error("Error restarting sequence:", e);
  }
}
main().finally(() => process.exit(0));
