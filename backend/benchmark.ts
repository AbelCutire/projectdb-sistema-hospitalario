import { execSync } from 'child_process';

const CONTENEDOR = 'bd-parcial';
const USUARIO = 'postgres';
const BASE_DATOS = 'postgres';
const CODIGO_PRUEBA = 50000;

// Ejecuta un comando en la terminal y devuelve la salida en texto
function ejecutarComando(comando: string): string {
    try {
        return execSync(comando, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error: any) {
        console.error(`Error ejecutando: ${comando}`);
        console.error(error.stderr || error.message);
        process.exit(1);
    }
}

// Facilita la ejecución de consultas SQL dentro del contenedor
function ejecutarSQL(query: string): string {
    return ejecutarComando(`docker exec ${CONTENEDOR} psql -U ${USUARIO} -d ${BASE_DATOS} -t -c "${query}"`);
}

console.log('========================================');
console.log(' 1. Cargando datos con Prisma');
console.log('========================================');
// En Windows se usa npx.cmd si ocurre un error con npx directo, pero child_process suele resolverlo.
ejecutarComando(process.platform === 'win32' ? 'npx.cmd prisma db seed' : 'npx prisma db seed');
console.log('Datos cargados exitosamente.\n');

console.log('========================================');
console.log(' 2. Configurando T-Tree en PostgreSQL');
console.log('========================================');
ejecutarSQL('CREATE EXTENSION IF NOT EXISTS t_tree;');
ejecutarSQL('DROP INDEX IF EXISTS idx_medicamento_ttree;');
console.log('Construyendo el índice en memoria...');
ejecutarSQL('CREATE INDEX idx_medicamento_ttree ON medicamento USING ttree (codigo);');
console.log('Índice construido.\n');

console.log('========================================');
console.log(` 3. Ejecutando Benchmark (código ${CODIGO_PRUEBA})`);
console.log('========================================');

// Ejecutar consultas forzando los planes de ejecución
const salidaSecuencial = ejecutarSQL(`SET enable_indexscan = off; SET enable_seqscan = on; EXPLAIN ANALYZE SELECT * FROM medicamento WHERE codigo = ${CODIGO_PRUEBA};`);
const salidaTTree = ejecutarSQL(`SET enable_seqscan = off; SET enable_indexscan = on; EXPLAIN ANALYZE SELECT * FROM medicamento WHERE codigo = ${CODIGO_PRUEBA};`);

// Extraer los tiempos con expresiones regulares
const matchSecuencial = salidaSecuencial.match(/Execution Time: ([\d.]+) ms/);
const matchTTree = salidaTTree.match(/Execution Time: ([\d.]+) ms/);

const tiempoSecuencial = matchSecuencial ? matchSecuencial[1] : 'Error';
const tiempoTTree = matchTTree ? matchTTree[1] : 'Error';

// Imprimir tabla comparativa
console.log('Resultados de Execution Time (ms):');
console.log('| Método          | Tiempo (ms)  |');
console.log('|-----------------|--------------|');
console.log(`| Secuencial      | ${tiempoSecuencial.padEnd(12)} |`);
console.log(`| T-Tree (C)      | ${tiempoTTree.padEnd(12)} |`);
console.log('========================================');
