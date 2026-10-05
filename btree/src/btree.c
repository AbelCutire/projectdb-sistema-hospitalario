/*
 * btree.c — B-Tree Index Implementation (Analogue to T-Tree)
 *
 * Proyecto Académico: Bases de Datos II — Indexación y Distribución
 * Estructura: B-Tree clásico con división de nodos (splits) en el descenso.
 */

#include "btree.h"

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include <stdint.h>

/* =========================================================================
 * GESTIÓN DE NODOS
 * ========================================================================= */

static BTreeNode *node_new(bool is_leaf)
{
    BTreeNode *n = (BTreeNode *)calloc(1, sizeof(BTreeNode));
    if (!n) return NULL;
    n->is_leaf = is_leaf;
    n->count = 0;
    return n;
}

static void node_free_recursive(BTreeNode *n)
{
    if (!n) return;
    if (!n->is_leaf) {
        for (int i = 0; i <= n->count; i++) {
            node_free_recursive(n->children[i]);
        }
    }
    free(n);
}

/* =========================================================================
 * OPERACIONES SOBRE EL ARREGLO INTERNO
 * ========================================================================= */

/* Búsqueda binaria en las claves del nodo: devuelve índice si encontrado, -(pos+1) si no */
static int node_bsearch(const BTreeNode *n, BTreeKey key)
{
    int lo = 0, hi = n->count - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (n->keys[mid] == key)  return mid;
        if (n->keys[mid] <  key)  lo = mid + 1;
        else                      hi = mid - 1;
    }
    return -(lo + 1);
}



/* =========================================================================
 * BÚSQUEDA EXACTA
 * ========================================================================= */

static bool search_node(const BTreeNode *node, BTreeKey key)
{
    if (!node) return false;

    int res = node_bsearch(node, key);
    if (res >= 0) return true;  /* encontrado en este nodo */

    if (node->is_leaf) return false;

    int pos = -(res + 1);
    return search_node(node->children[pos], key);
}

/* =========================================================================
 * BÚSQUEDA POR RANGO
 * ========================================================================= */

static size_t range_node(const BTreeNode *node,
                         BTreeKey lower, BTreeKey upper,
                         BTreeKey *results, size_t max_results, size_t found)
{
    if (!node || found >= max_results) return found;

    int i = 0;
    while (i < node->count && node->keys[i] < lower) {
        i++;
    }

    /* Si no es hoja, buscar en el hijo i (que puede contener claves >= lower) */
    if (!node->is_leaf) {
        found = range_node(node->children[i], lower, upper, results, max_results, found);
        if (found >= max_results) return found;
    }

    /* Recorrer las claves del nodo desde i en adelante */
    while (i < node->count && found < max_results) {
        if (node->keys[i] > upper) {
            break;
        }
        results[found++] = node->keys[i];
        if (found >= max_results) return found;

        if (!node->is_leaf) {
            found = range_node(node->children[i + 1], lower, upper, results, max_results, found);
            if (found >= max_results) return found;
        }
        i++;
    }

    return found;
}

/* =========================================================================
 * INSERCIÓN (CLRS B-Tree Insertion Algorithm)
 * ========================================================================= */

/* Divide el hijo y del padre en el índice i */
static void split_child(BTreeNode *parent, int i, BTreeNode *y)
{
    int t = BTREE_NODE_MAX / 2; /* mediano: para max=7, t=3 */
    BTreeNode *z = node_new(y->is_leaf);
    
    /* z recibe las claves desde y->keys[t+1] hasta y->keys[BTREE_NODE_MAX-1] */
    z->count = BTREE_NODE_MAX - t - 1;
    for (int j = 0; j < z->count; j++) {
        z->keys[j] = y->keys[t + 1 + j];
    }

    /* Si y no es hoja, z recibe los hijos correspondientes */
    if (!y->is_leaf) {
        for (int j = 0; j <= z->count; j++) {
            z->children[j] = y->children[t + 1 + j];
        }
    }

    y->count = t; /* y se queda con las primeras t claves (0..t-1) */

    /* Desplazar los hijos del padre para hacer espacio para z */
    for (int j = parent->count; j >= i + 1; j--) {
        parent->children[j + 1] = parent->children[j];
    }
    parent->children[i + 1] = z;

    /* Desplazar las claves del padre para insertar la clave mediana de y */
    for (int j = parent->count - 1; j >= i; j--) {
        parent->keys[j + 1] = parent->keys[j];
    }
    parent->keys[i] = y->keys[t];
    parent->count++;
}

/* Inserta una clave en un nodo que NO está lleno */
static bool insert_non_full(BTreeNode *node, BTreeKey key, BTree *tree)
{
    int res = node_bsearch(node, key);
    if (res >= 0) {
        return false; /* duplicado encontrado en este nodo */
    }

    int i = -(res + 1);

    if (node->is_leaf) {
        /* Desplazar claves e insertar */
        for (int j = node->count; j > i; j--) {
            node->keys[j] = node->keys[j - 1];
        }
        node->keys[i] = key;
        node->count++;
        return true;
    } else {
        /* Verificar si hay duplicado en el hijo o descendiente (opcional, bsearch lo cubre abajo) */
        BTreeNode *child = node->children[i];
        if (child->count == BTREE_NODE_MAX) {
            split_child(node, i, child);
            if (node->keys[i] == key) {
                return false; /* duplicado exacto en el elemento promovido */
            }
            if (node->keys[i] < key) {
                i++;
            }
            child = node->children[i];
        }
        return insert_non_full(child, key, tree);
    }
}

/* =========================================================================
 * API PÚBLICA
 * ========================================================================= */

BTree *btree_create(void)
{
    return (BTree *)calloc(1, sizeof(BTree));
}

void btree_destroy(BTree *tree)
{
    if (!tree) return;
    node_free_recursive(tree->root);
    free(tree);
}

BTree *btree_build(const BTreeKey *keys, size_t n)
{
    BTree *t = btree_create();
    if (!t) return NULL;
    for (size_t i = 0; i < n; i++) {
        btree_insert(t, keys[i]);
    }
    return t;
}

bool btree_search(BTree *tree, BTreeKey key)
{
    if (!tree || !tree->root) return false;
    return search_node(tree->root, key);
}

bool btree_insert(BTree *tree, BTreeKey key)
{
    if (!tree) return false;

    if (!tree->root) {
        tree->root = node_new(true);
        if (!tree->root) return false;
        tree->root->keys[0] = key;
        tree->root->count = 1;
        tree->size = 1;
        tree->node_count = 1;
        return true;
    }

    BTreeNode *r = tree->root;
    if (r->count == BTREE_NODE_MAX) {
        /* Raíz llena: el árbol crece en altura */
        BTreeNode *s = node_new(false);
        if (!s) return false;
        tree->root = s;
        s->children[0] = r;
        split_child(s, 0, r);
        tree->node_count++;

        bool inserted = insert_non_full(s, key, tree);
        if (inserted) {
            tree->size++;
        }
        return inserted;
    } else {
        bool inserted = insert_non_full(r, key, tree);
        if (inserted) {
            tree->size++;
        }
        return inserted;
    }
}

size_t btree_range_search(BTree *tree, BTreeKey lower, BTreeKey upper,
                          BTreeKey *results, size_t max_results)
{
    if (!tree || !tree->root || lower > upper || !results || max_results == 0)
        return 0;
    return range_node(tree->root, lower, upper, results, max_results, 0);
}

size_t btree_size(const BTree *tree)   { return tree ? tree->size : 0; }

static int compute_height(const BTreeNode *n)
{
    if (!n) return 0;
    if (n->is_leaf) return 1;
    return 1 + compute_height(n->children[0]);
}

int btree_height(const BTree *tree)
{
    if (!tree || !tree->root) return 0;
    return compute_height(tree->root);
}

/* =========================================================================
 * IMPRESIÓN
 * ========================================================================= */

static void print_node(const BTreeNode *n, int depth, const char *pre)
{
    if (!n) return;
    printf("%*s%s[leaf=%d count=%d] [", depth * 4, "", pre, n->is_leaf, n->count);
    for (int i = 0; i < n->count; i++) {
        printf("%" PRId64, n->keys[i]);
        if (i < n->count - 1) printf(",");
    }
    printf("]\n");

    if (!n->is_leaf) {
        for (int i = 0; i <= n->count; i++) {
            char buf[32];
            snprintf(buf, sizeof(buf), "C[%d]:", i);
            print_node(n->children[i], depth + 1, buf);
        }
    }
}

void btree_print(BTree *tree)
{
    printf("=== B-Tree [size=%zu nodes=%zu height=%d] ===\n",
           tree ? tree->size : 0,
           tree ? tree->node_count : 0,
           btree_height(tree));
    if (!tree || !tree->root) printf("  (vacío)\n");
    else print_node(tree->root, 0, "ROOT:");
    printf("===\n");
}

/* =========================================================================
 * VALIDACIÓN ESTRUCTURAL
 * ========================================================================= */

typedef struct { int errors; size_t total_keys; } BVCtx;

static void vcheck(const BTreeNode *n, BTreeKey lo, BTreeKey hi, BVCtx *ctx)
{
    if (!n) return;

    /* Count en rango válido */
    if (n->count <= 0 || n->count > BTREE_NODE_MAX) {
        fprintf(stderr, "  [ERR B-Tree] count=%d inválido\n", n->count);
        ctx->errors++;
        return;
    }

    /* Claves ordenadas ascendentemente */
    for (int i = 1; i < n->count; i++) {
        if (n->keys[i] <= n->keys[i - 1]) {
            fprintf(stderr, "  [ERR B-Tree] claves desordenadas: keys[%d]=%" PRId64
                    " <= keys[%d]=%" PRId64 "\n",
                    i, n->keys[i], i - 1, n->keys[i - 1]);
            ctx->errors++;
        }
    }

    /* Límites BST */
    if (lo != BTREE_KEY_INVALID && n->keys[0] <= lo) {
        fprintf(stderr, "  [ERR B-Tree BST] keys[0]=%" PRId64 " debería ser > %" PRId64 "\n",
                n->keys[0], lo);
        ctx->errors++;
    }
    if (hi != INT64_MAX && n->keys[n->count - 1] >= hi) {
        fprintf(stderr, "  [ERR B-Tree BST] keys[last]=%" PRId64 " debería ser < %" PRId64 "\n",
                n->keys[n->count - 1], hi);
        ctx->errors++;
    }

    ctx->total_keys += (size_t)n->count;

    if (!n->is_leaf) {
        for (int i = 0; i <= n->count; i++) {
            BTreeKey child_lo = (i == 0) ? lo : n->keys[i - 1];
            BTreeKey child_hi = (i == n->count) ? hi : n->keys[i];
            vcheck(n->children[i], child_lo, child_hi, ctx);
        }
    }
}

bool btree_validate(BTree *tree)
{
    if (!tree) { fprintf(stderr, "btree_validate: NULL\n"); return false; }
    if (!tree->root) return tree->size == 0;

    BVCtx ctx = {0, 0};
    vcheck(tree->root, BTREE_KEY_INVALID, INT64_MAX, &ctx);

    if (ctx.total_keys != tree->size) {
        fprintf(stderr, "  [ERR B-Tree] size=%zu contadas=%zu\n", tree->size, ctx.total_keys);
        ctx.errors++;
    }

    if (ctx.errors > 0) {
        fprintf(stderr, "btree_validate: FALLO (%d errores)\n", ctx.errors);
        return false;
    }
    return true;
}
