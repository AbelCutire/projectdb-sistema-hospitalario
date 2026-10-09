-- 1. Declarar la función handler principal
CREATE OR REPLACE FUNCTION ttree_handler(internal)
RETURNS index_am_handler
AS 'MODULE_PATHNAME'
LANGUAGE C STRICT;

-- 2. Registrar el nuevo Access Method
CREATE ACCESS METHOD ttree TYPE INDEX HANDLER ttree_handler;

-- 3. Crear una familia de operadores para compatibilidad con enteros
CREATE OPERATOR FAMILY ttree_int4_ops USING ttree;

-- 4. Crear la clase de operador, utilizando las funciones internas de btree para comparar
CREATE OPERATOR CLASS ttree_int4_ops
DEFAULT FOR TYPE int4 USING ttree FAMILY ttree_int4_ops AS
    OPERATOR 1 =,
    FUNCTION 1 btint4cmp(int4, int4);
