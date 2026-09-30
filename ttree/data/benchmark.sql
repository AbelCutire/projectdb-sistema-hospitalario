--pruebas

DROP TABLE IF EXISTS ttree_test;
CREATE TABLE ttree_test (
    id BIGINT NOT NULL
);

INSERT INTO ttree_test (id)
SELECT (random() * 10000000)::BIGINT
FROM generate_series(1, 1000000);

ANALYZE ttree_test;

\echo ''
\echo '--- BENCHMARK: SIN ÍNDICE ---'

-- Búsqueda exacta
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM ttree_test WHERE id = 500000;

-- Búsqueda por rango (1% del rango)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM ttree_test WHERE id BETWEEN 100000 AND 200000;

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

