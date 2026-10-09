import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. Crear las dependencias obligatorias según el esquema
  const accion = await prisma.accion_terapeutica.create({
    data: { tipo: 'Analgésico General' }
  })
  const droga = await prisma.monodroga.create({
    data: { descripcion: 'Paracetamol 500mg' }
  })
  const lab = await prisma.laboratorio_produccion.create({
    data: { nombre: 'Laboratorios Genéricos S.A.', descripcion: 'Producción masiva' }
  })

  // 2. Insertar 100,000 medicamentos en lotes
  console.log('Generando 100,000 registros de medicamentos...')
  const loteSize = 10000;

  for (let i = 0; i < 10; i++) {
    const lote = Array.from({ length: loteSize }).map((_, index) => ({
      nombre: `Medicamento Prueba ${i * loteSize + index}`,
      descripcion: 'Lote de prueba de rendimiento',
      id_accion_terapeutica: accion.id_accion_terapeutica,
      id_monodroga: droga.id_monodroga,
      codigo_laboratorio: lab.codigo
    }))

    await prisma.medicamento.createMany({ data: lote })
    console.log(`Insertados ${(i + 1) * loteSize} registros...`)
  }

  console.log('Población de base de datos finalizada.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
