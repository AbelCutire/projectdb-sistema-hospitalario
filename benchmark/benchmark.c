/*
 * benchmark.c -- Comparativa de rendimiento: T-Tree vs B-Tree
 *
 * Proyecto Academico: Bases de Datos II
 *
 * Compilar (Windows):
 *   gcc -Wall -Wextra -std=c11 -O2 benchmark.c ../ttree/ttree.c ../btree/src/btree.c -o benchmark.exe
 *
 * Compilar (Linux):
 *   gcc -Wall -Wextra -std=c11 -O2 benchmark.c ../ttree/ttree.c ../btree/src/btree.c -o benchmark
 */

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <time.h>
#include <string.h>

#include "../ttree/ttree.h"
#include "../btree/src/btree.h"

/* -----------------------------------------------------------------------
 * Medicion de tiempo usando clock()
 * ----------------------------------------------------------------------- */
static double get_time_sec(void)
{
    return (double)clock() / (double)CLOCKS_PER_SEC;
}

/* -----------------------------------------------------------------------
 * Fisher-Yates shuffle
 * ----------------------------------------------------------------------- */
static void shuffle(int *arr, int n)
{
    for (int i = n - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        int tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
}

/* -----------------------------------------------------------------------
 * Busqueda por rango en T-Tree SIN imprimir (para benchmark justo).
 * Recorre el arbol en inorden contando claves en [lo, hi].
 * Accede directamente a TNode porque la estructura esta expuesta en ttree.h.
 * ----------------------------------------------------------------------- */
static int ttree_range_count(TNode *n, int lo, int hi)
{
    if (!n) return 0;

    int kmin = n->entries[0].key;
    int kmax = n->entries[n->nkeys - 1].key;
    int count = 0;

    /* Poda: si el maximo del nodo < lo, solo buscar a la derecha */
    if (kmax < lo)
        return ttree_range_count(n->right, lo, hi);

    /* Poda: si el minimo del nodo > hi, solo buscar a la izquierda */
    if (kmin > hi)
        return ttree_range_count(n->left, lo, hi);

    /* Recorrer inorden: izq -> nodo -> der */
    count += ttree_range_count(n->left, lo, hi);

    for (int i = 0; i < n->nkeys; i++) {
        if (n->entries[i].key >= lo && n->entries[i].key <= hi)
            count++;
    }

    count += ttree_range_count(n->right, lo, hi);
    return count;
}

/* -----------------------------------------------------------------------
 * Contar nodos del T-Tree
 * ----------------------------------------------------------------------- */
static int ttree_count_nodes(TNode *n)
{
    if (!n) return 0;
    return 1 + ttree_count_nodes(n->left) + ttree_count_nodes(n->right);
}

/* -----------------------------------------------------------------------
 * Altura del T-Tree
 * ----------------------------------------------------------------------- */
static int ttree_get_height(TNode *n)
{
    return n ? n->height : 0;
}

/* -----------------------------------------------------------------------
 * Imprimir una linea de resultado con ganador
 * ----------------------------------------------------------------------- */
static void print_row(const char *metrica, double tt_val, double bt_val, const char *unit)
{
    const char *winner;
    double ratio;

    if (tt_val <= bt_val) {
        winner = "T-Tree";
        ratio = (tt_val > 0.0001) ? bt_val / tt_val : 1.0;
    } else {
        winner = "B-Tree";
        ratio = (bt_val > 0.0001) ? tt_val / bt_val : 1.0;
    }

    printf("  %-36s | %10.3f %-4s | %10.3f %-4s | %s (%.2fx)\n",
           metrica, tt_val, unit, bt_val, unit, winner, ratio);
}

/* =======================================================================
 * BENCHMARK PRINCIPAL
 * ======================================================================= */
static void run_benchmark(int N)
{
    printf("\n+======================================================================+\n");
    printf("|  BENCHMARK con N = %d claves\n", N);
    printf("+======================================================================+\n");

    /* Generar claves pares: 0, 2, 4, ..., 2*(N-1)
     * Los impares sirven como claves inexistentes */
    int *keys = (int *)malloc((size_t)N * sizeof(int));
    int *shuffled = (int *)malloc((size_t)N * sizeof(int));
    if (!keys || !shuffled) {
        fprintf(stderr, "ERROR: sin memoria para %d claves\n", N);
        return;
    }

    for (int i = 0; i < N; i++) {
        keys[i] = i * 2;
        shuffled[i] = i * 2;
    }
    shuffle(shuffled, N);

    double t0, t1;

    /* =================================================================
     * 1. INSERCION ALEATORIA
     * ================================================================= */
    TTree ttree = ttree_init();
    t0 = get_time_sec();
    for (int i = 0; i < N; i++)
        ttree_insert(&ttree, shuffled[i], shuffled[i]);
    t1 = get_time_sec();
    double tt_insert = (t1 - t0) * 1000.0;

    BTree *btree = btree_create();
    t0 = get_time_sec();
    for (int i = 0; i < N; i++)
        btree_insert(btree, (BTreeKey)shuffled[i]);
    t1 = get_time_sec();
    double bt_insert = (t1 - t0) * 1000.0;

    /* =================================================================
     * 2. BUSQUEDA EXACTA - EXITO (claves existentes)
     * ================================================================= */
    int lookups = N > 100000 ? 100000 : N;

    t0 = get_time_sec();
    int tt_found = 0;
    for (int i = 0; i < lookups; i++) {
        int rowid;
        if (ttree_search(&ttree, keys[i], &rowid)) tt_found++;
    }
    t1 = get_time_sec();
    double tt_search_hit = (t1 - t0) * 1000.0;

    t0 = get_time_sec();
    int bt_found = 0;
    for (int i = 0; i < lookups; i++) {
        if (btree_search(btree, (BTreeKey)keys[i])) bt_found++;
    }
    t1 = get_time_sec();
    double bt_search_hit = (t1 - t0) * 1000.0;

    /* =================================================================
     * 3. BUSQUEDA EXACTA - FALLO (claves inexistentes: impares)
     * ================================================================= */
    t0 = get_time_sec();
    int tt_miss = 0;
    for (int i = 0; i < lookups; i++) {
        int rowid;
        if (!ttree_search(&ttree, keys[i] + 1, &rowid)) tt_miss++;
    }
    t1 = get_time_sec();
    double tt_search_miss = (t1 - t0) * 1000.0;

    t0 = get_time_sec();
    int bt_miss = 0;
    for (int i = 0; i < lookups; i++) {
        if (!btree_search(btree, (BTreeKey)(keys[i] + 1))) bt_miss++;
    }
    t1 = get_time_sec();
    double bt_search_miss = (t1 - t0) * 1000.0;

    /* =================================================================
     * 4. BUSQUEDA POR RANGO (sin imprimir, contando resultados)
     * ================================================================= */
    int range_queries = 1000;
    int range_width = N / 10;
    if (range_width < 10) range_width = 10;
    BTreeKey *res_buffer = (BTreeKey *)malloc((size_t)(range_width * 2 + 1) * sizeof(BTreeKey));

    /* T-Tree: usa nuestra funcion local que cuenta sin printf */
    t0 = get_time_sec();
    long tt_range_total = 0;
    for (int q = 0; q < range_queries; q++) {
        int low = (rand() % (N > range_width ? (N - range_width) : 1)) * 2;
        int high = low + range_width * 2;
        tt_range_total += ttree_range_count(ttree.root, low, high);
    }
    t1 = get_time_sec();
    double tt_range = (t1 - t0) * 1000.0;

    /* B-Tree */
    t0 = get_time_sec();
    long bt_range_total = 0;
    for (int q = 0; q < range_queries; q++) {
        int64_t low = (int64_t)((rand() % (N > range_width ? (N - range_width) : 1)) * 2);
        int64_t high = low + range_width * 2;
        bt_range_total += (long)btree_range_search(btree, low, high, res_buffer, (size_t)(range_width * 2 + 1));
    }
    t1 = get_time_sec();
    double bt_range = (t1 - t0) * 1000.0;

    /* =================================================================
     * 5. BUSQUEDAS PUNTUALES REPETIDAS (favorece T-Tree por cache)
     * El T-Tree almacena multiples claves por nodo, lo que mejora
     * la localidad de cache en accesos repetidos sobre un rango pequeno.
     * ================================================================= */
    int hot_lookups = 200000;
    int hot_range = N < 1000 ? N : 1000;  /* buscar dentro de las primeras 1000 claves */

    t0 = get_time_sec();
    int tt_hot = 0;
    for (int i = 0; i < hot_lookups; i++) {
        int k = (rand() % hot_range) * 2;
        int rowid;
        if (ttree_search(&ttree, k, &rowid)) tt_hot++;
    }
    t1 = get_time_sec();
    double tt_hot_time = (t1 - t0) * 1000.0;

    t0 = get_time_sec();
    int bt_hot = 0;
    for (int i = 0; i < hot_lookups; i++) {
        int k = (rand() % hot_range) * 2;
        if (btree_search(btree, (BTreeKey)k)) bt_hot++;
    }
    t1 = get_time_sec();
    double bt_hot_time = (t1 - t0) * 1000.0;

    /* =================================================================
     * 6. ESTRUCTURA Y MEMORIA
     * ================================================================= */
    int tt_nodes = ttree_count_nodes(ttree.root);
    int tt_height = ttree_get_height(ttree.root);
    int bt_height_val = btree_height(btree);
    size_t bt_nodes = btree->node_count;

    size_t tt_mem = (size_t)tt_nodes * sizeof(TNode) + sizeof(TTree);
    size_t bt_mem = bt_nodes * sizeof(BTreeNode) + sizeof(BTree);

    /* =================================================================
     * TABLA DE RESULTADOS
     * ================================================================= */
    printf("\n  %-36s | %-15s | %-15s | %s\n",
           "Metrica", "T-Tree", "B-Tree", "Ganador");
    printf("  -------------------------------------+-----------------+-----------------+------------------\n");

    print_row("Insercion Aleatoria",       tt_insert,      bt_insert,      "ms");
    print_row("Busqueda Exitosa (Hit)",    tt_search_hit,  bt_search_hit,  "ms");
    print_row("Busqueda Fallida (Miss)",   tt_search_miss, bt_search_miss, "ms");
    print_row("Busqueda por Rango (1k q)", tt_range,       bt_range,       "ms");
    print_row("Lookups Repetidos (200k)",  tt_hot_time,    bt_hot_time,    "ms");

    printf("\n  %-36s | %-15d | %-15d |\n", "Altura del Arbol", tt_height, bt_height_val);
    printf("  %-36s | %-15d | %-15zu |\n",  "Total de Nodos",   tt_nodes,  bt_nodes);
    printf("  %-36s | %10.2f KB   | %10.2f KB   |\n",
           "Memoria Estimada", (double)tt_mem / 1024.0, (double)bt_mem / 1024.0);
    printf("  %-36s | %10.2f B    | %10.2f B    |\n",
           "Bytes por Clave", (double)tt_mem / (double)N, (double)bt_mem / (double)N);

    printf("\n  Verificacion: T-Tree hit=%d/%d miss=%d/%d | B-Tree hit=%d/%d miss=%d/%d\n",
           tt_found, lookups, tt_miss, lookups,
           bt_found, lookups, bt_miss, lookups);
    printf("  Rango total: T-Tree=%ld resultados | B-Tree=%ld resultados\n",
           tt_range_total, bt_range_total);
    printf("  Hot lookups: T-Tree=%d encontrados | B-Tree=%d encontrados\n",
           tt_hot, bt_hot);

    /* Limpieza */
    free(res_buffer);
    free(keys);
    free(shuffled);
    ttree_destroy(&ttree);
    btree_destroy(btree);
}

/* =======================================================================
 * MAIN
 * ======================================================================= */
int main(void)
{
    srand(42);
    printf("=======================================================================\n");
    printf("   ESTUDIO COMPARATIVO DE RENDIMIENTO: T-TREE vs B-TREE\n");
    printf("   Proyecto Bases de Datos II\n");
    printf("=======================================================================\n");

    run_benchmark(1000);
    run_benchmark(10000);
    run_benchmark(100000);
    run_benchmark(500000);
    run_benchmark(1000000);

    printf("\n=======================================================================\n");
    printf("   FIN DEL BENCHMARK\n");
    printf("=======================================================================\n");

    return 0;
}
