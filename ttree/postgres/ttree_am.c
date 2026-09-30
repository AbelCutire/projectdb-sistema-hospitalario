

#define BUILDING_TTREE_PG
#include "ttree_am.h"
#include "../src/ttree.h"

/* Macro obligatoria para módulos de PostgreSQL */
PG_MODULE_MAGIC;


typedef struct TTreeScanState {
    TTree    *tree;          /* árbol cargado en memoria para este scan */
    TTreeKey *results;       /* buffer de resultados del rango              */
    size_t    result_count;  /* cuántos resultados hay                      */
    size_t    result_pos;    /* posición actual en el buffer                */
    TTreeKey  scan_lower;    /* límite inferior del rango actual            */
    TTreeKey  scan_upper;    /* límite superior del rango actual            */
} TTreeScanState;

#define MAX_SCAN_RESULTS  1000000  /* límite práctico para fase académica */


Datum
ttree_handler(PG_FUNCTION_ARGS)
{
    IndexAmRoutine *amroutine = makeNode(IndexAmRoutine);


    amroutine->amstrategies      = 5;    
    amroutine->amsupport         = 1;    
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
    amroutine->amkeytype         = INT8OID; 



    /* Construcción */
    amroutine->ambuild           = ttree_build_index;
    amroutine->ambuildempty      = ttree_buildempty;


    amroutine->aminsert          = ttree_insert;
    amroutine->aminsertcleanup   = NULL;   


    amroutine->ambeginscan       = ttree_beginscan;
    amroutine->amrescan          = ttree_rescan;
    amroutine->amgettuple        = ttree_gettuple;
    amroutine->amgetbitmap       = ttree_getbitmap;
    amroutine->amendscan         = ttree_endscan;


    amroutine->ambulkdelete      = NULL;   
    amroutine->amvacuumcleanup   = NULL;
    amroutine->amcanreturn       = NULL;


    amroutine->amcostestimate    = ttree_costestimate;


    amroutine->amoptions         = ttree_options;


    amroutine->amvalidate        = ttree_validate_am;
    amroutine->amadjustmembers   = NULL;

    PG_RETURN_POINTER(amroutine);
}


/* CONSTRUCCIÓN DEL ÍNDICE — ambuild*/

typedef struct TTreeBuildState {
    TTree              *tree;
    double              heap_tuples;
    Relation            indexRel;
    IndexInfo          *indexInfo;
} TTreeBuildState;

/*
 * Callback 
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

    elog(NOTICE, "ttree: índice construido con %zu claves (altura=%d)",
         ttree_size(bstate.tree), ttree_height(bstate.tree));

    /* El árbol se liberaa */
    ttree_destroy(bstate.tree);

    result = (IndexBuildResult *)palloc(sizeof(IndexBuildResult));
    result->heap_tuples  = bstate.heap_tuples;
    result->index_tuples = bstate.heap_tuples;

    return result;
}


void
ttree_buildempty(Relation index)
{
    /* Para fase académica: no hacer nada, el árbol se crea on-demand */
    (void)index;
}


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
   
    if (isnull[0])
        return false;

    (void)heap;
    (void)checkUnique;
    (void)indexUnchanged;
    (void)indexInfo;
    (void)heap_tid;

    int64_t key = DatumGetInt64(values[0]);

    
    elog(DEBUG1, "ttree_insert: key=%" PRId64, (int64_t)key);

    return false;  /* false = no hay conflicto de unicidad */
}


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


bool
ttree_gettuple(IndexScanDesc scan, ScanDirection direction)
{
    TTreeScanState *state = (TTreeScanState *)scan->opaque;

    /* Primera llamada: ejecutar la búsqueda por rango */
    if (state->result_pos == 0 && state->result_count == 0) {
        if (!state->tree) {
            
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


int64
ttree_getbitmap(IndexScanDesc scan, TIDBitmap *tbm)
{
    TTreeScanState *state = (TTreeScanState *)scan->opaque;
    (void)tbm;

    if (!state->tree)
        return 0;

    
    return 0;
}


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
    
    (void)root;
    (void)path;
    (void)loop_count;

    *indexStartupCost  = 0.0;
    *indexTotalCost    = 1.0;   /* costo simbólico */
    *indexSelectivity  = 0.01;
    *indexCorrelation  = 0.0;
    *indexPages        = 1.0;
}

bytea *
ttree_options(Datum reloptions, bool validate)
{
    (void)reloptions;
    (void)validate;
    return NULL;
}

bool
ttree_validate_am(Oid opclassoid)
{
    
    (void)opclassoid;
    return true;
}
