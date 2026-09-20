/*
 * ttree.c — Implementación del T-Tree
 *
 * Proyecto Académico: Bases de Datos II — Indexación y Distribución en PostgreSQL
 *
 * TEORÍA:
 * Un T-Tree es un árbol binario de búsqueda balanceado (AVL) donde cada nodo
 * contiene un ARREGLO ORDENADO de claves (entre TTREE_NODE_MIN y TTREE_NODE_MAX).
 *
 * Invariante BST del T-Tree:
 *   max(subárbol_izq)  <  N.keys[0]  ≤  N.keys[count-1]  <  min(subárbol_der)
 *
 * Tipos de nodos:
 *   - Hoja:    sin hijos
 *   - Semihoja: exactamente un hijo
 *   - Interno: dos hijos
 *
 * Referencia:
 *   Lehman & Carey (1986). "A Study of Index Structures for Main Memory DBMS".
 *   VLDB 1986, pp. 294-303.
 *
 * -------------------------------------------------------------------------
 * ALGORITMO DE INSERCIÓN (Lehman & Carey, simplificado):
 * -------------------------------------------------------------------------
 *
 * 1. Si el árbol está vacío → crear nodo raíz.
 * 2. Descender buscando el "nodo responsable" (bounding node) de la clave.
 *    El nodo responsable N satisface: N.min ≤ key ≤ N.max
 *    O bien: es el último nodo visitado antes de llegar a un NULL.
 *
 * 3. Si se encontró nodo responsable:
 *    a. Si hay espacio → insertar en el arreglo.
 *    b. Si está lleno → crear nuevo nodo en el lugar apropiado.
 *       El nuevo nodo se inserta como hijo (izq o der) y se propaga
 *       hacia arriba con rebalanceo AVL.
 *
 * 4. Si no hay nodo responsable (key < min_total o key > max_total):
 *    - Descender hasta el primer NULL y crear nodo hoja.
 *
 * IMPORTANTE: En esta implementación se usa un enfoque simplificado pero
 * correcto: la inserción siempre desciente hasta el nodo hoja apropiado
 * o hasta encontrar espacio, manteniendo el invariante BST en todo momento.
 *
 * -------------------------------------------------------------------------
 * COMPLEJIDADES
 * -------------------------------------------------------------------------
 *   Búsqueda exacta  : O(log n)
 *   Inserción        : O(log n)
 *   Construcción     : O(n log n)
 *   Búsqueda rango   : O(log n + m)
 *   Destrucción      : O(n)
 * -------------------------------------------------------------------------
 */

#include "ttree.h"

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include <stdint.h>

/* =========================================================================
 * UTILIDADES INTERNAS
 * ========================================================================= */

static inline int imax(int a, int b) { return (a > b) ? a : b; }

static inline int      node_height(const TTreeNode *n) { return n ? n->height : 0; }
static inline int      node_bf(const TTreeNode *n)
{
    return n ? node_height(n->left) - node_height(n->right) : 0;
}
static inline TTreeKey node_min(const TTreeNode *n) { return n->keys[0]; }
static inline TTreeKey node_max(const TTreeNode *n) { return n->keys[n->count - 1]; }

/* =========================================================================
 * GESTIÓN DE NODOS
 * ========================================================================= */

static TTreeNode *node_new(void)
{
    TTreeNode *n = (TTreeNode *)calloc(1, sizeof(TTreeNode));
    if (!n) return NULL;
    n->height = 1;
    return n;
}

static void node_free_recursive(TTreeNode *n)
{
    if (!n) return;
    node_free_recursive(n->left);
    node_free_recursive(n->right);
    free(n);
}

static void update_height(TTreeNode *n)
{
    if (n) n->height = 1 + imax(node_height(n->left), node_height(n->right));
}

/* =========================================================================
 * OPERACIONES SOBRE EL ARREGLO INTERNO
 * ========================================================================= */

/* Búsqueda binaria: devuelve índice si encontrado, -(pos+1) si no */
static int node_bsearch(const TTreeNode *n, TTreeKey key)
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

static bool node_contains(const TTreeNode *n, TTreeKey key)
{
    return node_bsearch(n, key) >= 0;
}

/* Inserta key manteniendo orden. Devuelve false si duplicado.
 * Precondición: n->count < TTREE_NODE_MAX */
static bool node_insert_sorted(TTreeNode *n, TTreeKey key)
{
    int res = node_bsearch(n, key);
    if (res >= 0) return false;   /* duplicado */
    int pos = -(res + 1);
    for (int j = n->count; j > pos; j--)
        n->keys[j] = n->keys[j - 1];
    n->keys[pos] = key;
    n->count++;
    return true;
}

/* Elimina la clave en posición idx */
static void node_remove_at(TTreeNode *n, int idx)
{
    for (int j = idx; j < n->count - 1; j++)
        n->keys[j] = n->keys[j + 1];
    n->count--;
}

static inline bool node_full(const TTreeNode *n) { return n->count >= TTREE_NODE_MAX; }

/* =========================================================================
 * ROTACIONES AVL
 * ========================================================================= */

static TTreeNode *rotate_right(TTreeNode *y)
{
    TTreeNode *x = y->left, *B = x->right;
    x->right = y; y->left = B;
    x->parent = y->parent; y->parent = x;
    if (B) B->parent = y;
    update_height(y); update_height(x);
    return x;
}

static TTreeNode *rotate_left(TTreeNode *x)
{
    TTreeNode *y = x->right, *B = y->left;
    y->left = x; x->right = B;
    y->parent = x->parent; x->parent = y;
    if (B) B->parent = x;
    update_height(x); update_height(y);
    return y;
}

static TTreeNode *rebalance(TTreeNode *n)
{
    if (!n) return NULL;
    update_height(n);
    int bal = node_bf(n);

    if (bal >  1 && node_bf(n->left)  >= 0) return rotate_right(n);
    if (bal >  1 && node_bf(n->left)  <  0) {
        n->left = rotate_left(n->left);
        if (n->left) n->left->parent = n;
        return rotate_right(n);
    }
    if (bal < -1 && node_bf(n->right) <= 0) return rotate_left(n);
    if (bal < -1 && node_bf(n->right) >  0) {
        n->right = rotate_right(n->right);
        if (n->right) n->right->parent = n;
        return rotate_left(n);
    }
    return n;
}

/* =========================================================================
 * INSERCIÓN — ALGORITMO CORRECTO DEL T-TREE
 * =========================================================================
 *
 * La función insert_recursive implementa el algoritmo real del T-Tree:
 *
 * En cada nodo N visitado con claves [kmin..kmax]:
 *
 *  1. key < kmin:
 *     - Si N tiene hijo izquierdo: descender.
 *     - Si N NO tiene hijo izquierdo (N es hoja o semihoja):
 *         a. Si N tiene espacio: insertar key aquí (pasa a ser el nuevo min).
 *         b. Si N está lleno: crear hijo izquierdo con key.
 *
 *  2. key > kmax:
 *     - Simétrico a 1 con hijo derecho.
 *
 *  3. kmin <= key <= kmax:
 *     - Es el "bounding node" de key.
 *     a. Duplicado: rechazar.
 *     b. Tiene espacio: insertar aquí.
 *     c. Está lleno: hay que crear espacio.
 *        - Si no tiene hijo izquierdo: desplazar kmin a un nuevo hijo izquierdo.
 *        - Si no tiene hijo derecho: desplazar kmax a un nuevo hijo derecho.
 *        - Si tiene ambos hijos: insertar en el subárbol que tenga menos altura
 *          (desplazando el mínimo al izquierdo si izq < der, o el máximo al
 *          derecho de lo contrario).
 *
 * CORRECCIÓN DEL INVARIANTE BST:
 * - Caso "desplazar kmin al hijo izquierdo": kmin < nuevos_kmin_del_nodo,
 *   y kmin > max(subárbol_izquierdo_actual) porque el invariante ya estaba
 *   satisfecho ANTES de la inserción. Pero esto no es cierto si el hijo
 *   izquierdo YA EXISTE y tiene elementos > kmin.
 *
 * SOLUCIÓN CORRECTA: cuando el nodo está lleno y tiene AMBOS hijos:
 * - Desplazamos kmax al subárbol derecho (insert_recursive normal).
 *   El subárbol derecho acepta kmax porque kmax > max(nodo_derecho_actual)
 *   NO necesariamente. Por eso NO podemos desplazar arbitrariamente.
 *
 * SOLUCIÓN REAL (implementada aquí):
 * En el caso 3c (lleno, ambos hijos), en lugar de desplazar claves,
 * simplemente dejamos que la inserción se propague HACIA ABAJO como en
 * un BST normal: si key < kmin, bajar izquierda; si key > kmax, bajar
 * derecha. Pero key está en [kmin, kmax], así que necesitamos decidir:
 * → Desplazamos el MÁXIMO al subárbol derecho (si der existe o cabe) O
 *   desplazamos el MÍNIMO al subárbol izquierdo (si izq existe o cabe).
 *
 * La ÚNICA garantía es:
 *   displaced_max > node_max(right_child) → NO garantizada.
 *   displaced_min < node_min(left_child)  → NO garantizada.
 *
 * Por tanto, la única solución correcta para el caso de nodo lleno con
 * key en rango es: hacer el split del nodo creando un nodo hermano
 * (como en B-Trees), o simplemente bajar por el subárbol correcto
 * reinsertando displaced via la función recursiva normal.
 *
 * IMPLEMENTACIÓN FINAL (simple y correcta):
 * Cuando el nodo está lleno y key ∈ [kmin, kmax]:
 *   1. Extraer displaced = kmax del nodo.
 *   2. Insertar key en el nodo (cabe porque quitamos uno).
 *   3. Llamar a insert_recursive(node->right, displaced, ...) —
 *      esto es correcto porque displaced era el máximo del nodo,
 *      por lo que displaced > todos los elementos restantes del nodo,
 *      Y displaced es ≤ min(right_subtree) (invariante original).
 *
 * ¿Por qué displaced ≤ min(right_subtree)?
 * Antes de la inserción, el invariante dice:
 *   node_max(N) < node_min(right_child)
 * → displaced = node_max(N) < node_min(right_child) ✓
 *
 * POR LO TANTO: insert_recursive(right, displaced) irá por el caso
 * key < kmin del right_child, lo que es correcto.
 *
 * El error anterior era que displaced > algunos nodos del subárbol derecho.
 * Pero eso no puede ocurrir si el invariante se mantenía antes: displaced
 * era el máximo del nodo N, y el invariante garantiza que era MENOR que
 * todo lo del subárbol derecho. ✓
 *
 * ENTONCES: el algoritmo de desplazar el máximo al subárbol derecho ES
 * correcto. El bug real estaba en el conteo de size (doble incremento).
 */
static TTreeNode *insert_recursive(TTreeNode *node,
                                   TTreeKey   key,
                                   TTree     *tree,
                                   bool      *inserted)
{
    /* Árbol vacío en este punto → crear nodo hoja */
    if (!node) {
        TTreeNode *n = node_new();
        if (!n) { *inserted = false; return NULL; }
        n->keys[0] = key;
        n->count   = 1;
        tree->node_count++;
        *inserted = true;
        return n;
    }

    TTreeKey kmin = node_min(node);
    TTreeKey kmax = node_max(node);

    /* === CASO A: key en el rango del nodo === */
    if (key >= kmin && key <= kmax) {

        if (node_contains(node, key)) {
            *inserted = false;
            return node;
        }

        if (!node_full(node)) {
            /* Hay espacio: insertar directamente */
            node_insert_sorted(node, key);
            *inserted = true;
            update_height(node);
            return node;
        }

        /*
         * Nodo lleno, key ∈ [kmin, kmax].
         *
         * Extraemos displaced = kmax (el mayor del nodo).
         * Insertamos key en el nodo (ahora tiene espacio).
         * Enviamos displaced al subárbol DERECHO.
         *
         * Corrección del invariante:
         *   Antes: node_max(N) < node_min(right) (invariante original)
         *   displaced = node_max(N)
         *   → displaced < node_min(right) ✓
         *   → insert_recursive(right, displaced) lo tratará como
         *     key < node_min(right), caso B (bajar izquierda), correcto.
         */
        TTreeKey displaced = kmax;
        node_remove_at(node, node->count - 1);
        node_insert_sorted(node, key);
        *inserted = true;

        /*
         * Reinsertar displaced en el subárbol derecho.
         * NO debemos contar esta inserción del desplazado como nueva clave
         * (el desplazado YA estaba en el árbol).
         * Usamos un flag separado y ajustamos tree->node_count si es necesario.
         */
        size_t nc_before = tree->node_count;
        bool sub_ok = false;
        /* Temporalmente "prestamos" el size para que sub no lo incremente */
        node->right = insert_recursive(node->right, displaced, tree, &sub_ok);
        if (node->right) node->right->parent = node;
        /* sub_ok debe ser true (displaced no era duplicado en right).
         * Pero insert_recursive NO modifica tree->size (solo lo hace ttree_insert).
         * Solo puede modificar tree->node_count si crea un nuevo nodo. */
        (void)sub_ok;
        (void)nc_before;

        return rebalance(node);
    }

    /* === CASO B: key < kmin → subárbol izquierdo === */
    if (key < kmin) {
        node->left = insert_recursive(node->left, key, tree, inserted);
        if (node->left) node->left->parent = node;
        return rebalance(node);
    }

    /* === CASO C: key > kmax → subárbol derecho === */
    node->right = insert_recursive(node->right, key, tree, inserted);
    if (node->right) node->right->parent = node;
    return rebalance(node);
}

/* =========================================================================
 * BÚSQUEDA EXACTA
 * ========================================================================= */

static bool search_node(const TTreeNode *node, TTreeKey key)
{
    if (!node) return false;
    TTreeKey kmin = node_min(node);
    TTreeKey kmax = node_max(node);
    if (key < kmin) return search_node(node->left,  key);
    if (key > kmax) return search_node(node->right, key);
    return node_contains(node, key);
}

/* =========================================================================
 * BÚSQUEDA POR RANGO
 * ========================================================================= */

static size_t range_node(const TTreeNode *node,
                         TTreeKey lower, TTreeKey upper,
                         TTreeKey *results, size_t max_results, size_t found)
{
    if (!node || found >= max_results) return found;

    TTreeKey kmin = node_min(node);
    TTreeKey kmax = node_max(node);

    /* Subárbol izquierdo: puede tener claves ≥ lower */
    if (node->left && lower < kmin) {
        found = range_node(node->left, lower, upper, results, max_results, found);
        if (found >= max_results) return found;
    }

    /* Claves de este nodo */
    if (kmax >= lower && kmin <= upper) {
        for (int i = 0; i < node->count && found < max_results; i++) {
            TTreeKey k = node->keys[i];
            if (k > upper) break;
            if (k >= lower) results[found++] = k;
        }
    }

    /* Subárbol derecho: puede tener claves ≤ upper */
    if (node->right && upper > kmax) {
        found = range_node(node->right, lower, upper, results, max_results, found);
    }

    return found;
}

/* =========================================================================
 * API PÚBLICA
 * ========================================================================= */

TTree *ttree_create(void)
{
    return (TTree *)calloc(1, sizeof(TTree));
}

void ttree_destroy(TTree *tree)
{
    if (!tree) return;
    node_free_recursive(tree->root);
    free(tree);
}

TTree *ttree_build(const TTreeKey *keys, size_t n)
{
    TTree *t = ttree_create();
    if (!t) return NULL;
    for (size_t i = 0; i < n; i++) ttree_insert(t, keys[i]);
    return t;
}

bool ttree_search(TTree *tree, TTreeKey key)
{
    if (!tree || !tree->root) return false;
    return search_node(tree->root, key);
}

bool ttree_insert(TTree *tree, TTreeKey key)
{
    if (!tree) return false;
    bool inserted = false;
    tree->root = insert_recursive(tree->root, key, tree, &inserted);
    if (tree->root) tree->root->parent = NULL;
    if (inserted) { tree->size++; return true; }
    return false;
}

size_t ttree_range_search(TTree *tree, TTreeKey lower, TTreeKey upper,
                          TTreeKey *results, size_t max_results)
{
    if (!tree || !tree->root || lower > upper || !results || max_results == 0)
        return 0;
    return range_node(tree->root, lower, upper, results, max_results, 0);
}

size_t ttree_size(const TTree *tree)   { return tree ? tree->size : 0; }
int    ttree_height(const TTree *tree) { return (tree && tree->root) ? tree->root->height : 0; }

/* =========================================================================
 * IMPRESIÓN
 * ========================================================================= */

static void print_node(const TTreeNode *n, int depth, const char *pre)
{
    if (!n) return;
    printf("%*s%s[h=%d bal=%+d] [", depth*4, "", pre,
           n->height, node_bf(n));
    for (int i = 0; i < n->count; i++) {
        printf("%" PRId64, n->keys[i]);
        if (i < n->count-1) printf(",");
    }
    printf("] (%d/%d)\n", n->count, TTREE_NODE_MAX);
    print_node(n->left,  depth+1, "L:");
    print_node(n->right, depth+1, "R:");
}

void ttree_print(TTree *tree)
{
    printf("=== T-Tree [size=%zu nodes=%zu height=%d] ===\n",
           tree ? tree->size : 0,
           tree ? tree->node_count : 0,
           ttree_height(tree));
    if (!tree || !tree->root) printf("  (vacío)\n");
    else print_node(tree->root, 0, "ROOT:");
    printf("===\n");
}

/* =========================================================================
 * VALIDACIÓN ESTRUCTURAL
 * ========================================================================= */

typedef struct { int errors; size_t total_keys; } VCtx;

static void vcheck(const TTreeNode *n, const TTreeNode *parent,
                   TTreeKey lo, TTreeKey hi, VCtx *ctx)
{
    if (!n) return;

    /* Padre */
    if (n->parent != parent) {
        fprintf(stderr, "  [ERR] padre incorrecto en nodo min=%" PRId64 "\n", node_min(n));
        ctx->errors++;
    }

    /* Count */
    if (n->count <= 0 || n->count > TTREE_NODE_MAX) {
        fprintf(stderr, "  [ERR] count=%d inválido\n", n->count);
        ctx->errors++;
        return;
    }

    /* Claves ordenadas estrictamente */
    for (int i = 1; i < n->count; i++) {
        if (n->keys[i] <= n->keys[i-1]) {
            fprintf(stderr, "  [ERR] claves desordenadas: keys[%d]=%" PRId64
                    " <= keys[%d]=%" PRId64 "\n",
                    i, n->keys[i], i-1, n->keys[i-1]);
            ctx->errors++;
        }
    }

    /* BST: min(nodo) debe ser > lo */
    if (lo != TTREE_KEY_INVALID && node_min(n) <= lo) {
        fprintf(stderr, "  [ERR BST] min(nodo)=%" PRId64 " debería ser > %" PRId64 "\n",
                node_min(n), lo);
        ctx->errors++;
    }
    /* BST: max(nodo) debe ser < hi */
    if (hi != INT64_MAX && node_max(n) >= hi) {
        fprintf(stderr, "  [ERR BST] max(nodo)=%" PRId64 " debería ser < %" PRId64 "\n",
                node_max(n), hi);
        ctx->errors++;
    }

    /* Altura */
    int eh = 1 + imax(node_height(n->left), node_height(n->right));
    if (n->height != eh) {
        fprintf(stderr, "  [ERR] altura: tiene=%d esperada=%d\n", n->height, eh);
        ctx->errors++;
    }

    /* Balance AVL */
    int bal = node_bf(n);
    if (bal < -1 || bal > 1) {
        fprintf(stderr, "  [ERR] balance AVL: factor=%d\n", bal);
        ctx->errors++;
    }

    ctx->total_keys += (size_t)n->count;

    vcheck(n->left,  n, lo,           node_min(n), ctx);
    vcheck(n->right, n, node_max(n),  hi,          ctx);
}

bool ttree_validate(TTree *tree)
{
    if (!tree) { fprintf(stderr, "ttree_validate: NULL\n"); return false; }
    if (!tree->root) return tree->size == 0;

    VCtx ctx = {0, 0};
    vcheck(tree->root, NULL, TTREE_KEY_INVALID, INT64_MAX, &ctx);

    if (ctx.total_keys != tree->size) {
        fprintf(stderr, "  [ERR] size=%zu contadas=%zu\n", tree->size, ctx.total_keys);
        ctx.errors++;
    }
    if (ctx.errors > 0) {
        fprintf(stderr, "ttree_validate: FALLO (%d errores)\n", ctx.errors);
        return false;
    }
    return true;
}
