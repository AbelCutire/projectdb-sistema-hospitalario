#include "postgres.h"
#include "fmgr.h"
#include "utils/memutils.h"

PG_MODULE_MAGIC;

#define MAX_KEYS 4
#define MIN_KEYS 2

typedef struct {
    int key;
    int rowid;
} Entry;

typedef struct TNode {
    Entry        entries[MAX_KEYS];
    int          nkeys;
    int          height;
    struct TNode *left;
    struct TNode *right;
} TNode;

/* Raiz global para mantener el arbol en memoria durante la sesion SQL */
static TNode *raiz_global = NULL;

/* ============================================================
 * GESTION DE MEMORIA DE POSTGRESQL
 * ============================================================ */
static TNode *node_new(void)
{
    /* Se aloja en TopMemoryContext para que no se borre al finalizar la consulta */
    TNode *n = (TNode *)MemoryContextAllocZero(TopMemoryContext, sizeof(TNode));
    if (!n) {
        ereport(ERROR, (errcode(ERRCODE_OUT_OF_MEMORY), errmsg("Sin memoria en TopMemoryContext")));
    }
    n->height = 1;
    n->nkeys  = 0;
    n->left   = NULL;
    n->right  = NULL;
    return n;
}

static void destroy_node(TNode *n)
{
    if (!n) return;
    destroy_node(n->left);
    destroy_node(n->right);
    pfree(n); /* Libera la memoria al gestor de PostgreSQL */
}

/* ============================================================
 * LOGICA DEL T-TREE (Helpers, Rotaciones, Insercion, Busqueda)
 * ============================================================ */
static int node_height(TNode *n) { return n ? n->height : 0; }

static void update_height(TNode *n)
{
    if (!n) return;
    int lh = node_height(n->left);
    int rh = node_height(n->right);
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
    int lo = 0, hi = n->nkeys - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (n->entries[mid].key == key) return mid;
        if (n->entries[mid].key < key) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

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
    if (!n) return NULL;
    update_height(n);
    int bf = balance_factor(n);

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

static TNode *insert_node(TNode *node, Entry e, bool *ok)
{
    if (!node) {
        TNode *n = node_new();
        n->entries[0] = e;
        n->nkeys = 1;
        *ok = true;
        return n;
    }

    int kmin = node_min(node);
    int kmax = node_max(node);

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
            node->nkeys--;
            node_insert_entry(node, e);
            *ok = true;
            bool sub_ok;
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
 * WRAPPERS SQL (API de la extensión para PostgreSQL)
 * ============================================================ */

/* ttree_insertar(integer) -> boolean */
PG_FUNCTION_INFO_V1(ttree_insertar);
Datum ttree_insertar(PG_FUNCTION_ARGS)
{
    int32 clave = PG_GETARG_INT32(0);
    bool ok = false;
    Entry e;
    e.key = clave;
    e.rowid = clave; /* Se usa la clave como ID para simplificar la inserción manual */

    raiz_global = insert_node(raiz_global, e, &ok);

    PG_RETURN_BOOL(ok);
}

/* ttree_buscar(integer) -> boolean */
PG_FUNCTION_INFO_V1(ttree_buscar);
Datum ttree_buscar(PG_FUNCTION_ARGS)
{
    int32 clave = PG_GETARG_INT32(0);
    TNode *cur = raiz_global;

    while (cur) {
        int kmin = node_min(cur);
        int kmax = node_max(cur);

        if (clave < kmin) {
            cur = cur->left;
        } else if (clave > kmax) {
            cur = cur->right;
        } else {
            if (node_find_binary(cur, clave) >= 0) {
                PG_RETURN_BOOL(true);
            }
            PG_RETURN_BOOL(false);
        }
    }
    PG_RETURN_BOOL(false);
}

/* ttree_limpiar() -> void (Útil para reiniciar el árbol sin apagar el contenedor) */
PG_FUNCTION_INFO_V1(ttree_limpiar);
Datum ttree_limpiar(PG_FUNCTION_ARGS)
{
    destroy_node(raiz_global);
    raiz_global = NULL;
    PG_RETURN_VOID();
}
