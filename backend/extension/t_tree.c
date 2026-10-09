#include "postgres.h"
#include "fmgr.h"

PG_MODULE_MAGIC;

PG_FUNCTION_INFO_V1(ttree_test);

Datum ttree_test(PG_FUNCTION_ARGS) {
    /* Prueba de conexión: solo retorna true */
    PG_RETURN_BOOL(true);
}
