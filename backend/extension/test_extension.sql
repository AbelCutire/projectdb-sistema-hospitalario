\timing on

\echo ''
\echo '=================================================='
\echo '    BATERIA DE PRUEBAS DE T-TREE EN POSTGRESQL'
\echo '=================================================='
\echo ''

\echo '---> 1. Limpiando el arbol...'
SELECT ttree_limpiar();
\echo ''

\echo '---> 2. INSERTAR: 1,000,000 de datos secuenciales (Peor caso AVL)'
SELECT count(ttree_insertar(i)) FROM generate_series(1, 1000000) AS i;
\echo ''

\echo '---> 3. BUSCAR: 5 datos que SI existen'
SELECT i as clave_buscada, ttree_buscar(i) as resultado 
FROM generate_series(500000, 500004) AS i;
\echo ''

\echo '---> 4. BUSCAR: 5 datos que NO existen'
SELECT i as clave_buscada, ttree_buscar(i) as resultado 
FROM generate_series(2000000, 2000004) AS i;
\echo ''

\echo '---> 5. Limpiando de nuevo...'
SELECT ttree_limpiar();
\echo ''

\echo '---> 6. INSERTAR: 2,000,000 de datos totalmente aleatorios (Realista)'
-- Multiplicamos por 10 millones para evitar muchos duplicados
SELECT count(ttree_insertar( (random() * 10000000)::int )) FROM generate_series(1, 2000000);
\echo ''

\echo '---> 7. BUSCAR: 10,000 busquedas aleatorias (Rendimiento por lote)'
-- Queremos ver cuanto tarda en hacer muchisimas busquedas.
SELECT count(*) as total_busquedas_exitosas 
FROM (
    SELECT ttree_buscar( (random() * 10000000)::int ) as encontrado 
    FROM generate_series(1, 10000)
) sub
WHERE encontrado = true;
\echo ''

\echo '=================================================='
\echo '               PRUEBAS FINALIZADAS'
\echo '=================================================='
