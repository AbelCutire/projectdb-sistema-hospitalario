import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function runSeeder() {
  try {
    console.log('🔍 Checking database for seeding...');

    // 1. Seed Farmacia
    const farmaciaCount = await prisma.farmacia.count();
    if (farmaciaCount === 0) {
      console.log('🌱 Seeding farmacia items...');
      await prisma.farmacia.createMany({
        data: [
          { nombre: 'Amoxicilina 500mg', stock: 120, precio: 1.50 },
          { nombre: 'Paracetamol 1g', stock: 300, precio: 0.50 },
          { nombre: 'Cetirizina 10mg', stock: 80, precio: 1.20 },
          { nombre: 'Ibuprofeno 400mg', stock: 250, precio: 0.80 },
        ]
      });
    }

    // 2. Seed Salas and Camillas
    const salaCount = await prisma.sala.count();
    if (salaCount === 0) {
      console.log('🌱 Seeding rooms and beds...');
      const sala1 = await prisma.sala.create({
        data: { tipo_sala: 'Urgencias', id_departamento: 2 }
      });
      const sala2 = await prisma.sala.create({
        data: { tipo_sala: 'UCI', id_departamento: 1 }
      });

      await prisma.camilla.createMany({
        data: [
          { id_sala: sala1.id_sala, estado: 'Disponible' },
          { id_sala: sala1.id_sala, estado: 'Ocupado' },
          { id_sala: sala1.id_sala, estado: 'Limpieza' },
          { id_sala: sala1.id_sala, estado: 'Disponible' },
          { id_sala: sala2.id_sala, estado: 'Disponible' },
          { id_sala: sala2.id_sala, estado: 'Ocupado' },
          { id_sala: sala2.id_sala, estado: 'Limpieza' },
          { id_sala: sala2.id_sala, estado: 'Ocupado' },
        ]
      });
    }

    // 3. Seed Diagnosis, Treatment and Recipes
    const diagnosticosCount = await prisma.diagnostico.count();
    if (diagnosticosCount === 0) {
      console.log('🌱 Seeding clinical diagnoses and prescriptions...');
      
      const citaCompletada = await prisma.cita.findFirst({
        where: { estado: 'Completada' }
      });

      const hc = await prisma.historial_clinico.findFirst();
      
      if (citaCompletada && hc) {
        const diag = await prisma.diagnostico.create({
          data: {
            descripcion: 'Hipertensión arterial controlada y faringitis aguda.',
            fecha: new Date(citaCompletada.fecha),
            id_paciente: citaCompletada.id_paciente,
            id_cita: citaCompletada.id_cita,
            id_historiaclinica: hc.id_historiaclinica
          }
        });

        const tratamiento = await prisma.tratamiento.create({
          data: {
            fecha_inicio: new Date(citaCompletada.fecha),
            fecha_fin: new Date(new Date(citaCompletada.fecha).getTime() + 7 * 24 * 60 * 60 * 1000),
            id_diagnostico: diag.id_diagnostico
          }
        });

        const receta = await prisma.receta.create({
          data: {
            fecha_emision: new Date(citaCompletada.fecha),
            id_tratamiento: tratamiento.id_tratamiento
          }
        });

        const med1 = await prisma.farmacia.findFirst({ where: { nombre: 'Amoxicilina 500mg' } });
        const med2 = await prisma.farmacia.findFirst({ where: { nombre: 'Paracetamol 1g' } });

        if (med1 && med2) {
          await prisma.detalle_receta.createMany({
            data: [
              { id_receta: receta.id_receta, id_farmacia: med1.id_farmacia, dosis: '1 cápsula', frecuencia: 'Cada 8 horas', duracion: '7 días' },
              { id_receta: receta.id_receta, id_farmacia: med2.id_farmacia, dosis: '1 tableta', frecuencia: 'Cada 8 horas', duracion: '3 días si hay dolor' }
            ]
          });
        }
      }
    }

    console.log('✅ Seeding checks completed.');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
}
