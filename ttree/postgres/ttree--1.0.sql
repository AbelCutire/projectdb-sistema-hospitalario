
--  eliminar:
--     DROP EXTENSION ttree CASCADE;
--: Solo ejecutar dentro de una transacción


-- =========================================================================
-- 1. REGISTRAR EL HANDLER DEL ACCESS METHOD
-- =========================================================================


CREATE FUNCTION ttree_handler(internal)
    RETURNS index_am_handler
    AS '$libdir/ttree_am', 'ttree_handler'
    LANGUAGE C STRICT;

-- =========================================================================
-- 2. REGISTRAR EL ACCESS METHOD
-- =========================================================================
--

CREATE ACCESS METHOD ttree
    TYPE INDEX
    HANDLER ttree_handler;

COMMENT ON ACCESS METHOD ttree IS
    'T-Tree Index Access Method — Árbol binario balanceado con nodos de arreglo';

-- =========================================================================
-- 3. OPERATOR CLASS PARA int8 (bigint)
-- =========================================================================


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


CREATE TABLE IF NOT EXISTS ttree_test (
    id  BIGINT NOT NULL
);

COMMENT ON TABLE ttree_test IS
    'Tabla de prueba para el T-Tree Index Access Method (Bases de Datos II)';

-- =========================================================================
-- 5. VISTAS DE DIAGNÓSTICO
-- =========================================================================

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

