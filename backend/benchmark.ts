import prisma from './src/config/database';
import { execSync } from 'child_process';

const CODIGO_PRUEBA = 50000;

async function run() {
    console.log('========================================');
    console.log(' 1. Cargando datos con Prisma Seed');
    console.log('========================================');
    try {
        const count = await prisma.medicamento.count();
        if (count < 100000) {
            console.log('Poblando datos de benchmark (100,000 medicamentos)...');
            execSync(process.platform === 'win32' ? 'npx.cmd prisma db seed' : 'npx prisma db seed', { stdio: 'inherit' });
        } else {
            console.log(`Ya existen ${count} medicamentos cargados.`);
        }
    } catch (e: any) {
        console.error('Error cargando seed:', e.message);
    }
    console.log('Datos listos.\n');

    console.log('========================================');
    console.log(' 2. Configurando T-Tree en PostgreSQL');
    console.log('========================================');
    try {
        await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS t_tree;');
        await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS idx_medicamento_ttree;');
        console.log('Construyendo el índice en memoria (USING ttree)...');
        await prisma.$executeRawUnsafe('CREATE INDEX idx_medicamento_ttree ON medicamento USING ttree (codigo);');
        console.log('Índice construido.\n');
    } catch (e: any) {
        console.error('Error configurando índice:', e.message);
    }

    console.log('========================================');
    console.log(` 3. Ejecutando Benchmark (código ${CODIGO_PRUEBA})`);
    console.log('========================================');

    try {
        // Ejecutar consultas forzando los planes de ejecución
        await prisma.$executeRawUnsafe('SET enable_indexscan = off;');
        await prisma.$executeRawUnsafe('SET enable_seqscan = on;');
        const resSecuencial: any = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE SELECT * FROM medicamento WHERE codigo = ${CODIGO_PRUEBA};`);

        await prisma.$executeRawUnsafe('SET enable_seqscan = off;');
        await prisma.$executeRawUnsafe('SET enable_indexscan = on;');
        const resTTree: any = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE SELECT * FROM medicamento WHERE codigo = ${CODIGO_PRUEBA};`);

        const textSecuencial = resSecuencial.map((r: any) => r['QUERY PLAN']).join('\n');
        const textTTree = resTTree.map((r: any) => r['QUERY PLAN']).join('\n');

        const matchSecuencial = textSecuencial.match(/Execution Time: ([\d.]+) ms/);
        const matchTTree = textTTree.match(/Execution Time: ([\d.]+) ms/);

        const tiempoSecuencial = matchSecuencial ? matchSecuencial[1] : 'Error';
        const tiempoTTree = matchTTree ? matchTTree[1] : 'Error';

        console.log('Resultados de Execution Time:');
        console.log('----------------------------------------');
        console.log(`| Método          | Tiempo (ms)        |`);
        console.log(`|-----------------|-------------------|`);
        console.log(`| Secuencial      | ${(tiempoSecuencial + ' ms').padEnd(17)} |`);
        console.log(`| T-Tree (C)      | ${(tiempoTTree + ' ms').padEnd(17)} |`);
        console.log('========================================');
    } catch (e: any) {
        console.error('Error ejecutando benchmark:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
