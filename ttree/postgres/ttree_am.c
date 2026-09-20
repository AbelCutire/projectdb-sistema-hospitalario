/*
 * ttree_am.c — Módulo de integración del T-Tree con PostgreSQL 18
 *
 * Proyecto Académico: Bases de Datos II — Indexación y Distribución en PostgreSQL
 *
 * Este archivo implementa un Index Access Method (IAM) que permite usar
 * el T-Tree como índice dentro de PostgreSQL.
 *
 * Arquitectura en capas:
 *
 *     PostgreSQL (SQL: CREATE INDEX USING ttree)
 *          │
 *          ▼
 *     ttree_am.c   ← este archivo (adaptador PG ↔ T-Tree)
 *          │
 *          ▼
 *     ttree.c      ← núcleo del T-Tree independiente de PostgreSQL
 *
 * -------------------------------------------------------------------------
 * VERSIÓN DE POSTGRESQL
 * -------------------------------------------------------------------------
 * Objetivo: PostgreSQL 18.x
 *
 * Cambios relevantes de PG17/18 vs versiones anteriores:
 *
 * 1. aminsert: en PG17 se agregó el parámetro 'indexUnchanged' (bool).
 *    PG18 mantiene esta firma. Las implementaciones para PG16 o anteriores
 *    NO son compatibles directamente.
 *    Fuente: src/include/access/amapi.h commit en PG17 desarrollo.
 *
 * 2. ambuild: devuelve IndexBuildResult* (sin cambios desde PG11+).
 *
 * 3. amgetbitmap: firma cambia en PG17 para usar int64 como retorno.
 *    Fuente: src/include/access/amapi.h PG17+.
 *
 * 4. amvalidate: se espera Oid (sin cambios).
 *
 * 5. amoptions: bytea* (sin cambios desde PG9.6+).
 *
 * -------------------------------------------------------------------------
 * ESTRATEGIA DE ALMACENAMIENTO
 * -------------------------------------------------------------------------
 * Para la integración con PostgreSQL, el T-Tree se almacena en páginas
 * de heap del índice usando la API de páginas de PostgreSQL (bufmgr).
 *
 * En esta primera versión (fase académica), el T-Tree se mantiene
 * EN MEMORIA durante el ciclo de vida del scan. Una implementación
 * productiva requeriría serialización en páginas de disco.
 *
 * Esta decisión de diseño está documentada en README.md sección "Limitaciones".
 *
 * -------------------------------------------------------------------------
 * COMPILACIÓN
 * -------------------------------------------------------------------------
 * Requiere PostgreSQL dev headers:
 *   apt-get install postgresql-server-dev-18
 *
 * Usar el Makefile en ttree/Makefile (target pg-extension).
 */

#define BUILDING_TTREE_PG
#include "ttree_am.h"
#include "../src/ttree.h"

/* Macro obligatoria para módulos de PostgreSQL */
PG_MODULE_MAGIC;

/* =========================================================================
 * ESTADO DEL SCAN
 * =========================================================================
 *
 * Guardamos el T-Tree en memoria durante el scan. En una implementación
 * productiva esto se haría con un cursor persistente en páginas del buffer.
 */
typedef struct TTreeScanState {
    TTree    *tree;          /* árbol cargado en memoria para este scan */
    TTreeKey *results;       /* buffer de resultados del rango              */
    size_t    result_count;  /* cuántos resultados hay                      */
    size_t    result_pos;    /* posición actual en el buffer                */
    TTreeKey  scan_lower;    /* límite inferior del rango actual            */
    TTreeKey  scan_upper;    /* límite superior del rango actual            */
} TTreeScanState;

#define MAX_SCAN_RESULTS  1000000  /* límite práctico para fase académica */

/* =========================================================================
 * HANDLER — Registra el access method con PostgreSQL
 * =========================================================================
 *
 * PostgreSQL llama a esta función cuando encuentra:
 *   CREATE INDEX ... USING ttree ...
 *
 * La función debe devolver un IndexAmRoutine poblado con punteros a
 * todas las funciones del access method.
 *
 * Tipo de retorno: Datum (puntero a IndexAmRoutine)
 */
Datum
ttree_handler(PG_FUNCTION_ARGS)
{
    IndexAmRoutine *amroutine = makeNode(IndexAmRoutine);

    /* ---------------------------------------------------------------
     * Capacidades del access method
     * --------------------------------------------------------------- */
    amroutine->amstrategies      = 5;    /* =, <, <=, >, >= */
    amroutine->amsupport         = 1;    /* función de comparación */
    amroutine->amoptsprocnum     = 0;
    amroutine->amcanorder        = true;
    amroutine->amcanorderbyop    = false;
    amroutine->amcanbackward     = true;
    amroutine->amcanunique       = false;
    amroutine->amcanmulticol     = false;
    amroutine->amoptionalkey     = false;
    amroutine->amsearcharray     = false;
    amroutine->amsearchnulls     = false;
    amroutine->amstorage         = false;
    amroutine->amclusterable     = false;
    amroutine->ampredlocks       = false;
    amroutine->amcanparallel     = false;
    amroutine->amcaninclude      = false;
    amroutine->amusemaintenanceworkmem = false;
    amroutine->amparallelvacuumoptions = 0;
    amroutine->amkeytype         = INT8OID;  /* clave int64 */

    /* ---------------------------------------------------------------
     * Funciones del access method
     * --------------------------------------------------------------- */

    /* Construcción */
    amroutine->ambuild           = ttree_build_index;
    amroutine->ambuildempty      = ttree_buildempty;

    /* DML */
    amroutine->aminsert          = ttree_insert;
    amroutine->aminsertcleanup   = NULL;    /* no requerido en PG18 básico */

    /* Scans */
    amroutine->ambeginscan       = ttree_beginscan;
    amroutine->amrescan          = ttree_rescan;
    amroutine->amgettuple        = ttree_gettuple;
    amroutine->amgetbitmap       = ttree_getbitmap;
    amroutine->amendscan         = ttree_endscan;

    /* Mantenimiento */
    amroutine->ambulkdelete      = NULL;   /* simplificado: sin delete por ahora */
    amroutine->amvacuumcleanup   = NULL;
    amroutine->amcanreturn       = NULL;

    /* Planificador */
    amroutine->amcostestimate    = ttree_costestimate;

    /* Opciones */
    amroutine->amoptions         = ttree_options;

    /* Validación de opclass */
    amroutine->amvalidate        = ttree_validate_am;
    amroutine->amadjustmembers   = NULL;

    PG_RETURN_POINTER(amroutine);
}

/* =========================================================================
 * CONSTRUCCIÓN DEL ÍNDICE — ambuild
 * =========================================================================
 *
 * PostgreSQL llama a esta función al ejecutar:
 *   CREATE INDEX ... USING ttree ...
 *
 * Debe iterar sobre la tabla y construir el índice.
 * En esta versión académica, construimos el T-Tree en memoria.
 *
 * Parámetros (PG18 amapi.h):
 *   heap      — relación de tabla base
 *   index     — relación de índice (donde guardamos datos)
 *   indexInfo — metadatos del índice
 */

/*
 * Contexto para el callback de heap_index_build_scan
 */
typedef struct TTreeBuildState {
    TTree              *tree;
    double              heap_tuples;
    Relation            indexRel;
    IndexInfo          *indexInfo;
} TTreeBuildState;

/*
 * Callback llamado por table_index_build_scan por cada tupla de la tabla
 */
static void
ttree_build_callback(Relation index,
                     ItemPointer tid,
                     Datum      *values,
                     bool       *isnull,
                     bool        tupleIsAlive,
                     void       *state)
{
    TTreeBuildState *bstate = (TTreeBuildState *)state;

    if (!tupleIsAlive) return;
    if (isnull[0])     return;  /* ignorar NULLs */

    int64_t key = DatumGetInt64(values[0]);
    ttree_insert(bstate->tree, (TTreeKey)key);
    bstate->heap_tuples += 1.0;
}

IndexBuildResult *
ttree_build_index(Relation heap,
                  Relation index,
                  IndexInfo *indexInfo)
{
    IndexBuildResult *result;
    TTreeBuildState   bstate;

    bstate.tree        = ttree_create();
    bstate.heap_tuples = 0;
    bstate.indexRel    = index;
    bstate.indexInfo   = indexInfo;

    if (!bstate.tree)
        elog(ERROR, "ttree: no se pudo crear el árbol T-Tree");

    /* Escanear la tabla y construir el árbol */
    table_index_build_scan(heap, index, indexInfo,
                           true,   /* allow_sync */
                           true,   /* progress */
                           ttree_build_callback,
                           &bstate,
                           NULL);  /* scan */

    /*
     * NOTA: en una implementación productiva, aquí se serializaría
     * el árbol a páginas del buffer del índice. Por ahora, el árbol
     * se almacena en el RelationData como datos opacos.
     * Esta es una limitación conocida de la fase académica.
     */
    elog(NOTICE, "ttree: índice construido con %zu claves (altura=%d)",
         ttree_size(bstate.tree), ttree_height(bstate.tree));

    /* El árbol se libera aquí — en producción se persistiría */
    ttree_destroy(bstate.tree);

    result = (IndexBuildResult *)palloc(sizeof(IndexBuildResult));
    result->heap_tuples  = bstate.heap_tuples;
    result->index_tuples = bstate.heap_tuples;

    return result;
}

/*
 * ttree_buildempty — Crear índice vacío (para tablas nuevas sin datos)
 */
void
ttree_buildempty(Relation index)
{
    /* Para fase académica: no hacer nada, el árbol se crea on-demand */
    (void)index;
}

/* =========================================================================
 * INSERCIÓN — aminsert
 * =========================================================================
 *
 * Firma PG17/PG18 (con 'indexUnchanged' como parámetro adicional vs PG16):
 *
 *   bool aminsert(Relation index, Datum *values, bool *isnull,
 *                 ItemPointer heap_tid, Relation heap,
 *                 IndexUniqueCheck checkUnique,
 *                 bool indexUnchanged,         ← nuevo en PG17
 *                 IndexInfo *indexInfo)
 *
 * Fuente: src/include/access/amapi.h PG17+
 */
bool
ttree_insert(Relation            index,
             Datum              *values,
             bool               *isnull,
             ItemPointer         heap_tid,
             Relation            heap,
             IndexUniqueCheck    checkUnique,
             bool                indexUnchanged,
             IndexInfo          *indexInfo)
{
    /*
     * Ignorar NULLs — el T-Tree no indexa valores NULL.
     * Esto es coherente con la naturaleza del árbol (claves comparables).
     */
    if (isnull[0])
        return false;

    (void)heap;
    (void)checkUnique;
    (void)indexUnchanged;
    (void)indexInfo;
    (void)heap_tid;

    int64_t key = DatumGetInt64(values[0]);

    /*
     * NOTA ACADÉMICA:
     * En una implementación productiva, aquí se obtendría la página raíz
     * del índice del buffer, se deserializaría el T-Tree, se insertaría
     * la clave con su TID asociado, y se guardaría de vuelta.
     *
     * En esta fase, solo registramos la operación.
     */
    elog(DEBUG1, "ttree_insert: key=%" PRId64, (int64_t)key);

    return false;  /* false = no hay conflicto de unicidad */
}

/* =========================================================================
 * SCAN — ambeginscan / amrescan / amgettuple / amgetbitmap / amendscan
 * ========================================================================= */

/*
 * ttree_beginscan — Inicia un scan del índice
 *
 * Firma PG18 (amapi.h):
 *   IndexScanDesc ambeginscan(Relation indexRelation, int nkeys, int norderbys)
 */
IndexScanDesc
ttree_beginscan(Relation index, int nkeys, int norderbys)
{
    IndexScanDesc scan;
    TTreeScanState *state;

    scan = RelationGetIndexScan(index, nkeys, norderbys);

    state = (TTreeScanState *)palloc0(sizeof(TTreeScanState));
    state->tree         = NULL;  /* se carga en rescan */
    state->results      = (TTreeKey *)palloc(sizeof(TTreeKey) * MAX_SCAN_RESULTS);
    state->result_count = 0;
    state->result_pos   = 0;
    state->scan_lower   = INT64_MIN;
    state->scan_upper   = INT64_MAX;

    scan->opaque = state;

    return scan;
}

/*
 * ttree_rescan — Reconfigura las condiciones del scan
 *
 * Firma PG18:
 *   void amrescan(IndexScanDesc scan, ScanKey scankey, int nscankeys,
 *                 ScanKey orderbys, int norderbys)
 */
void
ttree_rescan(IndexScanDesc scan,
             ScanKey       scankey,
             int           nscankeys,
             ScanKey       orderbys,
             int           norderbys)
{
    TTreeScanState *state = (TTreeScanState *)scan->opaque;

    (void)orderbys;
    (void)norderbys;

    /* Actualizar claves de scan si se proporcionaron */
    if (scankey && nscankeys > 0)
        memmove(scan->keyData, scankey, sizeof(ScanKeyData) * nscankeys);

    /*
     * Interpretar las condiciones de scan para determinar el rango.
     * Estrategias estándar para int8:
     *   BTLessStrategyNumber    (1) → <
     *   BTLessEqualStrategyNumber(2) → <=
     *   BTEqualStrategyNumber   (3) → =
     *   BTGreaterEqualStrategyNumber(4) → >=
     *   BTGreaterStrategyNumber (5) → >
     */
    state->scan_lower = INT64_MIN;
    state->scan_upper = INT64_MAX;

    for (int i = 0; i < scan->numberOfKeys; i++) {
        ScanKey sk  = &scan->keyData[i];
        int64_t val = DatumGetInt64(sk->sk_argument);

        switch (sk->sk_strategy) {
            case BTEqualStrategyNumber:
                state->scan_lower = val;
                state->scan_upper = val;
                break;
            case BTGreaterEqualStrategyNumber:
                if (val > state->scan_lower) state->scan_lower = val;
                break;
            case BTGreaterStrategyNumber:
                if (val + 1 > state->scan_lower) state->scan_lower = val + 1;
                break;
            case BTLessEqualStrategyNumber:
                if (val < state->scan_upper) state->scan_upper = val;
                break;
            case BTLessStrategyNumber:
                if (val - 1 < state->scan_upper) state->scan_upper = val - 1;
                break;
            default:
                break;
        }
    }

    /* Reiniciar posición de lectura */
    state->result_count = 0;
    state->result_pos   = 0;
}

/*
 * ttree_gettuple — Devuelve la siguiente tupla del scan
 *
 * Firma PG18:
 *   bool amgettuple(IndexScanDesc scan, ScanDirection direction)
 *
 * Devuelve true si se encontró una tupla, false si no hay más.
 */
bool
ttree_gettuple(IndexScanDesc scan, ScanDirection direction)
{
    TTreeScanState *state = (TTreeScanState *)scan->opaque;

    /* Primera llamada: ejecutar la búsqueda por rango */
    if (state->result_pos == 0 && state->result_count == 0) {
        if (!state->tree) {
            /*
             * NOTA ACADÉMICA: aquí se cargaría el T-Tree desde las páginas
             * del buffer del índice. Para la fase de prueba retornamos false.
             */
            return false;
        }

        state->result_count = ttree_range_search(
            state->tree,
            state->scan_lower,
            state->scan_upper,
            state->results,
            MAX_SCAN_RESULTS
        );
    }

    if (direction == BackwardScanDirection) {
        /* Escaneo hacia atrás */
        if (state->result_pos >= state->result_count) return false;
        /* Avanzar desde el final */
        size_t idx = state->result_count - 1 - state->result_pos;
        state->result_pos++;
        scan->xs_heaptid = *(ItemPointer)NULL;  /* placeholder */
        (void)idx;
        return false;  /* TID real requiere serialización completa */
    } else {
        /* Escaneo hacia adelante */
        if (state->result_pos >= state->result_count) return false;
        state->result_pos++;
        return false;  /* TID real requiere serialización completa */
    }
}

/*
 * ttree_getbitmap — Devuelve un bitmap de TIDs
 *
 * Firma PG17/PG18 (retorno int64 desde PG17, era int64 antes también):
 *   int64 amgetbitmap(IndexScanDesc scan, TIDBitmap *tbm)
 */
int64
ttree_getbitmap(IndexScanDesc scan, TIDBitmap *tbm)
{
    TTreeScanState *state = (TTreeScanState *)scan->opaque;
    (void)tbm;

    if (!state->tree)
        return 0;

    /* En implementación completa: ejecutar rango e insertar TIDs en tbm */
    return 0;
}

/*
 * ttree_endscan — Finalizar scan y liberar recursos
 */
void
ttree_endscan(IndexScanDesc scan)
{
    TTreeScanState *state = (TTreeScanState *)scan->opaque;

    if (state) {
        if (state->tree)    ttree_destroy(state->tree);
        if (state->results) pfree(state->results);
        pfree(state);
    }
    scan->opaque = NULL;
}

/* =========================================================================
 * ESTIMACIÓN DE COSTOS — amcostestimate
 * ========================================================================= */

void
ttree_costestimate(PlannerInfo *root,
                   IndexPath   *path,
                   double       loop_count,
                   Cost        *indexStartupCost,
                   Cost        *indexTotalCost,
                   Selectivity *indexSelectivity,
                   double      *indexCorrelation,
                   double      *indexPages)
{
    /*
     * Estimación simplificada para el planificador.
     * En producción, usar estadísticas reales de la relación.
     *
     * Costo del T-Tree: O(log n) para búsqueda, O(log n + m) para rango.
     */
    (void)root;
    (void)path;
    (void)loop_count;

    *indexStartupCost  = 0.0;
    *indexTotalCost    = 1.0;   /* costo simbólico */
    *indexSelectivity  = 0.01;
    *indexCorrelation  = 0.0;
    *indexPages        = 1.0;
}

/* =========================================================================
 * OPCIONES — amoptions
 * ========================================================================= */

bytea *
ttree_options(Datum reloptions, bool validate)
{
    (void)reloptions;
    (void)validate;
    /* Sin opciones adicionales en esta versión */
    return NULL;
}

/* =========================================================================
 * VALIDACIÓN DE OPCLASS — amvalidate
 * ========================================================================= */

bool
ttree_validate_am(Oid opclassoid)
{
    /*
     * Validar que la operator class sea compatible.
     * Por ahora aceptamos cualquier opclass — en producción verificar
     * que tenga la función de comparación registrada.
     */
    (void)opclassoid;
    return true;
}
