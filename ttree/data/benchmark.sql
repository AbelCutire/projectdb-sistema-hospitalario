-- data/benchmark.sql
-- Script de benchmark comparativo: Sin índice vs B-Tree vs T-Tree
--
-- Proyecto Académico: Bases de Datos II
--
-- Ejecutar en psql después de instalar la extensión ttree:
--   \i data/benchmark.sql
--
-- Requiere:
--   CREATE EXTENSION ttree;   (instalada previamente)

-- =========================================================================
-- 1. PREPARACIÓN DE LA TABLA DE PRUEBA
-- =========================================================================

DROP TABLE IF EXISTS ttree_test;
CREATE TABLE ttree_test (
    id BIGINT NOT NULL
);

-- Poblar con 1,000,000 de valores aleatorios (puede tardar ~30s)
INSERT INTO ttree_test (id)
SELECT (random() * 10000000)::BIGINT
FROM generate_series(1, 1000000);

ANALYZE ttree_test;

-- =========================================================================
-- 2. BENCHMARK SIN ÍNDICE
-- =========================================================================

\echo ''
\echo '--- BENCHMARK: SIN ÍNDICE ---'

-- Búsqueda exacta
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM ttree_test WHERE id = 500000;

-- Búsqueda por rango (1% del rango)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM ttree_test WHERE id BETWEEN 100000 AND 200000;

-- =========================================================================
-- 3. BENCHMARK CON B-TREE (índice estándar de PostgreSQL)
-- =========================================================================

\echo ''
\echo '--- CREANDO ÍNDICE B-TREE ---'

DROP INDEX IF EXISTS idx_btree_test;
CREATE INDEX idx_btree_test ON ttree_test USING btree (id);
ANALYZE ttree_test;

\echo '--- BENCHMARK: B-TREE ---'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM ttree_test WHERE id = 500000;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM ttree_test WHERE id BETWEEN 100000 AND 200000;

DROP INDEX idx_btree_test;

-- =========================================================================
-- 4. BENCHMARK CON T-TREE
-- =========================================================================

\echo ''
\echo '--- CREANDO ÍNDICE T-TREE ---'

DROP INDEX IF EXISTS idx_ttree_test;
CREATE INDEX idx_ttree_test ON ttree_test USING ttree (id);
ANALYZE ttree_test;

\echo '--- BENCHMARK: T-TREE ---'

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM ttree_test WHERE id = 500000;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM ttree_test WHERE id BETWEEN 100000 AND 200000;

DROP INDEX idx_ttree_test;

-- =========================================================================
-- 5. RESUMEN COMPARATIVO (manual — completar con resultados reales)
-- =========================================================================

/*
  TABLA COMPARATIVA (rellenar con los tiempos observados):

  Operación                | Sin índice | B-Tree   | T-Tree
  -------------------------|------------|----------|--------
  Búsqueda exacta          |  XX ms     |  XX ms   |  XX ms
  Búsqueda rango (100k)    |  XX ms     |  XX ms   |  XX ms

  Conclusiones:
  - ...
*/
