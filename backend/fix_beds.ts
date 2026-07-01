import prisma from './src/config/database';

async function main() {
  const rs = await prisma.ingreso_hospitalizacion.findMany();
  // Get occupied beds from active hospitalizations (fecha_alta in future)
  const activeBeds = rs.filter(r => new Date(r.fecha_alta) > new Date()).map(r => r.id_camilla);

  // Get all beds currently marked Ocupada
  const ocupadas = await prisma.camilla.findMany({ where: { estado: 'Ocupada' }});

  let fixed = 0;
  for (const cam of ocupadas) {
    if (!activeBeds.includes(cam.id_camilla)) {
      await prisma.camilla.update({ where: { id_camilla: cam.id_camilla }, data: { estado: 'Disponible' }});
      fixed++;
    }
  }

  console.log(`Fixed ${fixed} stuck beds.`);
}
main().finally(() => process.exit(0));
