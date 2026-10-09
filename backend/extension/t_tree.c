#include "postgres.h"
#include "fmgr.h"
#include "access/amapi.h"
#include "access/relscan.h"
#include "access/tableam.h"
#include "utils/memutils.h"
#include "catalog/index.h"
#include "nodes/execnodes.h"
#include "nodes/pathnodes.h"
#include "optimizer/cost.h"
#include "commands/vacuum.h"

PG_MODULE_MAGIC;

#define MAX_KEYS 4
#define MIN_KEYS 2

typedef struct {
    int key;
    ItemPointerData tid;
} Entry;

typedef struct TNode {
    Entry        entries[MAX_KEYS];
    int          nkeys;
    int          height;
    struct TNode *left;
    struct TNode *right;
} TNode;

static TNode *raiz_global = NULL;
static MemoryContext TTreeContext = NULL; /* Contexto aislado para el millón de datos */

/* ============================================================
 * GESTIÓN DE MEMORIA Y HELPERS
 * ============================================================ */
static TNode *node_new(void)
{
    TNode *n;
    if (!TTreeContext) {
        TTreeContext = AllocSetContextCreate(TopMemoryContext,
                                             "TTreeContext",
                                             ALLOCSET_DEFAULT_SIZES);
    }
    n = (TNode *)MemoryContextAllocZero(TTreeContext, sizeof(TNode));
    if (!n) {
        ereport(ERROR, (errcode(ERRCODE_OUT_OF_MEMORY), errmsg("Sin memoria en TTreeContext")));
    }
    n->height = 1;
    n->nkeys  = 0;
    n->left   = NULL;
    n->right  = NULL;
    return n;
}

static int node_height(TNode *n) { return n ? n->height : 0; }

static void update_height(TNode *n)
{
    int lh, rh;
    if (!n) return;
    lh = node_height(n->left);
    rh = node_height(n->right);
    n->height = 1 + (lh > rh ? lh : rh);
}

static int balance_factor(TNode *n)
{
    if (!n) return 0;
    return node_height(n->left) - node_height(n->right);
}

static int node_min(TNode *n) { return n->entries[0].key; }
static int node_max(TNode *n) { return n->entries[n->nkeys - 1].key; }

static void node_insert_entry(TNode *n, Entry e)
{
    int i = n->nkeys - 1;
    while (i >= 0 && n->entries[i].key > e.key) {
        n->entries[i + 1] = n->entries[i];
        i--;
    }
    n->entries[i + 1] = e;
    n->nkeys++;
}

static int node_find_binary(TNode *n, int key)
{
    int lo = 0, hi = n->nkeys - 1, mid;
    while (lo <= hi) {
        mid = (lo + hi) / 2;
        if (n->entries[mid].key == key) return mid;
        if (n->entries[mid].key < key) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

/* ============================================================
 * ROTACIONES AVL Y BALANCEO
 * ============================================================ */
static TNode *rotate_right(TNode *y)
{
    TNode *x = y->left;
    TNode *B = x->right;
    x->right = y;
    y->left  = B;
    update_height(y);
    update_height(x);
    return x;
}

static TNode *rotate_left(TNode *x)
{
    TNode *y = x->right;
    TNode *B = y->left;
    y->left  = x;
    x->right = B;
    update_height(x);
    update_height(y);
    return y;
}

static TNode *rebalance(TNode *n)
{
    int bf;
    if (!n) return NULL;
    update_height(n);
    bf = balance_factor(n);

    if (bf > 1 && balance_factor(n->left) >= 0) return rotate_right(n);
    if (bf > 1 && balance_factor(n->left) < 0) {
        n->left = rotate_left(n->left);
        return rotate_right(n);
    }
    if (bf < -1 && balance_factor(n->right) <= 0) return rotate_left(n);
    if (bf < -1 && balance_factor(n->right) > 0) {
        n->right = rotate_right(n->right);
        return rotate_left(n);
    }
    return n;
}

/* ============================================================
 * INSERCIÓN EN EL T-TREE
 * ============================================================ */
static TNode *insert_node(TNode *node, Entry e, bool *ok)
{
    int kmin, kmax;

    if (!node) {
        TNode *n = node_new();
        n->entries[0] = e;
        n->nkeys = 1;
        *ok = true;
        return n;
    }

    kmin = node_min(node);
    kmax = node_max(node);

    if (e.key >= kmin && e.key <= kmax) {
        if (node_find_binary(node, e.key) >= 0) {
            *ok = false;
            return node;
        }
        if (node->nkeys < MAX_KEYS) {
            node_insert_entry(node, e);
            *ok = true;
        } else {
            Entry displaced = node->entries[node->nkeys - 1];
            bool sub_ok;
            node->nkeys--;
            node_insert_entry(node, e);
            *ok = true;
            node->right = insert_node(node->right, displaced, &sub_ok);
        }
        return rebalance(node);
    }

    if (e.key < kmin) {
        node->left = insert_node(node->left, e, ok);
        return rebalance(node);
    }

    node->right = insert_node(node->right, e, ok);
    return rebalance(node);
}

/* ============================================================
 * DUMMIES OBLIGATORIOS PARA PLANNER Y VACUUM
 * ============================================================ */
static void ttree_costestimate(PlannerInfo *root, IndexPath *path, double loop_count, Cost *indexStartupCost, Cost *indexTotalCost, Selectivity *indexSelectivity, double *indexCorrelation, double *indexPages)
{
    /* Engañamos al planificador con un costo bajísimo para forzar su uso */
    *indexStartupCost = 0.0;
    *indexTotalCost = 1.0;
    *indexSelectivity = 0.001;
    *indexCorrelation = 0.0;
    *indexPages = 1.0;
}

static void ttree_buildempty(Relation index) { }

static IndexBulkDeleteResult *ttree_bulkdelete(IndexVacuumInfo *info, IndexBulkDeleteResult *stats, IndexBulkDeleteCallback callback, void *callback_state)
{
    return stats;
}

static IndexBulkDeleteResult *ttree_vacuumcleanup(IndexVacuumInfo *info, IndexBulkDeleteResult *stats)
{
    return stats;
}

/* ============================================================
 * INDEX ACCESS METHOD (API NATIVA DE POSTGRESQL)
 * ============================================================ */
static void ttree_build_callback(Relation index, ItemPointer tid, Datum *values, bool *isnull, bool tupleIsAlive, void *state)
{
    int32 clave;
    bool ok = false;
    Entry e;

    if (isnull[0]) return;

    clave = DatumGetInt32(values[0]);
    e.key = clave;
    e.tid = *tid;

    raiz_global = insert_node(raiz_global, e, &ok);
}

IndexBuildResult *ttree_build(Relation heap, Relation index, IndexInfo *indexInfo)
{
    IndexBuildResult *result;
    double reltuples;

    result = (IndexBuildResult *) palloc0(sizeof(IndexBuildResult));

    /* Limpieza O(1) de memoria aislada */
    if (TTreeContext) {
        MemoryContextDelete(TTreeContext);
        TTreeContext = NULL;
    }
    raiz_global = NULL;

    reltuples = table_index_build_scan(heap, index, indexInfo, true, true, ttree_build_callback, NULL, NULL);

    result->heap_tuples = reltuples;
    result->index_tuples = reltuples;
    return result;
}

bool ttree_insert_tuple(Relation rel, Datum *values, bool *isnull, ItemPointer ht_ctid, Relation heapRel, IndexUniqueCheck checkUnique, bool indexUnchanged, IndexInfo *indexInfo)
{
    bool ok = false;
    Entry e;

    if (isnull[0]) return false;

    e.key = DatumGetInt32(values[0]);
    e.tid = *ht_ctid;

    raiz_global = insert_node(raiz_global, e, &ok);
    return ok;
}

IndexScanDesc ttree_beginscan(Relation rel, int nkeys, int norderbys)
{
    IndexScanDesc scan = RelationGetIndexScan(rel, nkeys, norderbys);
    scan->opaque = palloc0(sizeof(bool));
    return scan;
}

void ttree_rescan(IndexScanDesc scan, ScanKey keys, int nkeys, ScanKey orderbys, int norderbys)
{
    if (keys && scan->numberOfKeys > 0) {
        memmove(scan->keyData, keys, scan->numberOfKeys * sizeof(ScanKeyData));
    }
    *((bool *) scan->opaque) = false;
}

bool ttree_gettuple(IndexScanDesc scan, ScanDirection dir)
{
    bool *ya_devuelto;
    int32 clave_buscada;
    TNode *cur = raiz_global;

    ya_devuelto = (bool *) scan->opaque;

    if (*ya_devuelto) return false;
    if (scan->numberOfKeys != 1) return false;

    clave_buscada = DatumGetInt32(scan->keyData[0].sk_argument);

    while (cur) {
        int kmin = cur->entries[0].key;
        int kmax = cur->entries[cur->nkeys - 1].key;

        if (clave_buscada < kmin) {
            cur = cur->left;
        } else if (clave_buscada > kmax) {
            cur = cur->right;
        } else {
            int lo = 0, hi = cur->nkeys - 1, mid;
            while (lo <= hi) {
                mid = (lo + hi) / 2;
                if (cur->entries[mid].key == clave_buscada) {
                    scan->xs_heaptid = cur->entries[mid].tid;
                    scan->xs_recheck = false;
                    *ya_devuelto = true;
                    return true;
                }
                if (cur->entries[mid].key < clave_buscada) lo = mid + 1;
                else hi = mid - 1;
            }
            return false;
        }
    }
    return false;
}

void ttree_endscan(IndexScanDesc scan)
{
    if (scan->opaque) pfree(scan->opaque);
}

PG_FUNCTION_INFO_V1(ttree_handler);
Datum ttree_handler(PG_FUNCTION_ARGS)
{
    IndexAmRoutine *amroutine = makeNode(IndexAmRoutine);

    amroutine->amstrategies = 1;
    amroutine->amsupport = 1;
    amroutine->amcanorder = false;
    amroutine->amcanunique = false;
    amroutine->amcanmulticol = false;
    amroutine->amoptionalkey = false;
    amroutine->amsearcharray = false;
    amroutine->amsearchnulls = false;
    amroutine->amstorage = false;
    amroutine->amclusterable = false;
    amroutine->ampredlocks = false;

    amroutine->ambuild = ttree_build;
    amroutine->ambuildempty = ttree_buildempty;
    amroutine->aminsert = ttree_insert_tuple;
    amroutine->ambulkdelete = ttree_bulkdelete;
    amroutine->amvacuumcleanup = ttree_vacuumcleanup;
    amroutine->amcanreturn = NULL;
    amroutine->amcostestimate = ttree_costestimate;
    amroutine->amoptions = NULL;
    amroutine->amproperty = NULL;
    amroutine->ambuildphasename = NULL;
    amroutine->amvalidate = NULL;
    amroutine->ambeginscan = ttree_beginscan;
    amroutine->amrescan = ttree_rescan;
    amroutine->amgettuple = ttree_gettuple;
    amroutine->amgetbitmap = NULL;
    amroutine->amendscan = ttree_endscan;
    amroutine->ammarkpos = NULL;
    amroutine->amrestrpos = NULL;

    PG_RETURN_POINTER(amroutine);
}
