-- ttree--1.0.sql
-- Script de instalación de la extensión T-Tree para PostgreSQL 18
--
-- Proyecto Académico: Bases de Datos II — Indexación y Distribución en PostgreSQL
--
-- Instrucciones:
--   En PostgreSQL (como superusuario):
--     CREATE EXTENSION ttree;
--
-- Para eliminar:
--     DROP EXTENSION ttree CASCADE;
--
-- Nota: Este script debe ejecutarse con \set ON_ERROR_STOP on
-- para abortar si algún paso falla.

-- =========================================================================
-- SEGURIDAD: Solo ejecutar dentro de una transacción
-- =========================================================================
-- Las instrucciones de CREATE EXTENSION se ejecutan en una transacción
-- implícita en PostgreSQL.

-- =========================================================================
-- 1. REGISTRAR EL HANDLER DEL ACCESS METHOD
-- =========================================================================
--
-- La función handler es el punto de entrada del módulo C.
-- '$libdir/ttree_am' hace referencia al archivo .so compilado
-- que debe estar en $PGPATH/lib/ o en el directorio de extensiones.

CREATE FUNCTION ttree_handler(internal)
    RETURNS index_am_handler
    AS '$libdir/ttree_am', 'ttree_handler'
    LANGUAGE C STRICT;

-- =========================================================================
-- 2. REGISTRAR EL ACCESS METHOD
-- =========================================================================
--
-- Esto registra el T-Tree como método de indexación válido en PostgreSQL.
-- Después de esto, CREATE INDEX ... USING ttree ... es válido.
--
-- Referencia: PostgreSQL 18 — CREATE ACCESS METHOD
-- https://www.postgresql.org/docs/18/sql-create-access-method.html

CREATE ACCESS METHOD ttree
    TYPE INDEX
    HANDLER ttree_handler;

COMMENT ON ACCESS METHOD ttree IS
    'T-Tree Index Access Method — Árbol binario balanceado con nodos de arreglo';

-- =========================================================================
-- 3. OPERATOR CLASS PARA int8 (bigint)
-- =========================================================================
--
-- Una operator class define qué operadores puede usar el índice.
-- Para el T-Tree sobre int64, registramos los operadores de comparación
-- estándar de int8 (bigint en PostgreSQL).
--
-- Referencia: src/backend/access/nbtree/nbtree.c (btree opclasses)
-- Las estrategias son:
--   1 → <    (BTLessStrategyNumber)
--   2 → <=   (BTLessEqualStrategyNumber)
--   3 → =    (BTEqualStrategyNumber)
--   4 → >=   (BTGreaterEqualStrategyNumber)
--   5 → >    (BTGreaterStrategyNumber)

CREATE OPERATOR CLASS ttree_int8_ops
    DEFAULT FOR TYPE int8
    USING ttree AS
        OPERATOR 1 <  (int8, int8),
        OPERATOR 2 <= (int8, int8),
        OPERATOR 3 =  (int8, int8),
        OPERATOR 4 >= (int8, int8),
        OPERATOR 5 >  (int8, int8),
        FUNCTION 1 btint8cmp(int8, int8);  -- función de soporte: comparación

COMMENT ON OPERATOR CLASS ttree_int8_ops USING ttree IS
    'Operator class para int8 (bigint) en el T-Tree';

-- =========================================================================
-- 4. TABLA DE PRUEBA
-- =========================================================================
--
-- Tabla mínima para verificar que el índice funciona y para benchmarks.
-- Posteriormente se puede poblar con datos de prueba para comparar:
--   - Sin índice
--   - Con B-Tree (índice estándar de PostgreSQL)
--   - Con T-Tree (este módulo)

CREATE TABLE IF NOT EXISTS ttree_test (
    id  BIGINT NOT NULL
);

COMMENT ON TABLE ttree_test IS
    'Tabla de prueba para el T-Tree Index Access Method (Bases de Datos II)';

-- =========================================================================
-- 5. VISTAS DE DIAGNÓSTICO
-- =========================================================================

-- Vista para ver si el access method está registrado
CREATE OR REPLACE VIEW ttree_info AS
SELECT
    amname,
    amtype,
    amhandler::text AS handler
FROM pg_am
WHERE amname = 'ttree';

COMMENT ON VIEW ttree_info IS
    'Información del access method T-Tree registrado en pg_am';

-- =========================================================================
-- 6. FUNCIONES DE UTILIDAD PARA PRUEBAS
-- =========================================================================

-- Genera N filas aleatorias en ttree_test
CREATE OR REPLACE FUNCTION ttree_populate(n BIGINT DEFAULT 1000000)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO ttree_test (id)
    SELECT (random() * 10000000)::BIGINT
    FROM generate_series(1, n);

    RAISE NOTICE 'ttree_test poblada con % filas', n;
END;
$$;

COMMENT ON FUNCTION ttree_populate IS
    'Poblar ttree_test con N filas aleatorias para pruebas de rendimiento';

-- =========================================================================
-- 7. INSTRUCCIONES DE USO (como comentarios SQL)
-- =========================================================================

/*
-- -----------------------------------------------------------------------
-- CREAR UN ÍNDICE T-TREE
-- -----------------------------------------------------------------------

-- Una vez instalada la extensión:
CREATE INDEX idx_ttree_test_id ON ttree_test USING ttree (id);

-- Verificar que el índice fue creado:
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ttree_test';

-- -----------------------------------------------------------------------
-- BENCHMARK COMPARATIVO
-- -----------------------------------------------------------------------

-- Poblar con 1 millón de filas:
SELECT ttree_populate(1000000);

-- Sin índice:
EXPLAIN ANALYZE SELECT * FROM ttree_test WHERE id = 500000;

-- Con B-Tree:
CREATE INDEX idx_btree_test ON ttree_test USING btree (id);
EXPLAIN ANALYZE SELECT * FROM ttree_test WHERE id = 500000;

-- Con T-Tree:
CREATE INDEX idx_ttree_test ON ttree_test USING ttree (id);
EXPLAIN ANALYZE SELECT * FROM ttree_test WHERE id = 500000;

-- Rango:
EXPLAIN ANALYZE SELECT * FROM ttree_test WHERE id BETWEEN 100000 AND 200000;

-- -----------------------------------------------------------------------
-- ELIMINAR EXTENSIÓN
-- -----------------------------------------------------------------------
DROP EXTENSION ttree CASCADE;  -- elimina el AM, operator class, índices, vista

*/
