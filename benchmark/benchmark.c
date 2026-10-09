/*
 * benchmark.c -- Comparativa de rendimiento: T-Tree vs B-Tree
 *
 * Proyecto Academico: Bases de Datos II
 *
 * Compara:
 *   1. Tiempo de Insercion (aleatoria)
 *   2. Tiempo de Busqueda Exacta (exito y fallo)
 *   3. Tiempo de Busqueda por Rango
 *
 * Compilar (desde la carpeta benchmark/):
 *   gcc -Wall -Wextra -std=c11 -O2 benchmark.c ../ttree/ttree.c ../btree/src/btree.c -o benchmark.exe
 */

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <time.h>
#include <string.h>
#include <io.h>       /* _dup, _dup2, _close (Windows) */

#include "../ttree/ttree.h"
#include "../btree/src/btree.h"

/* -----------------------------------------------------------------------
 * Medicion de tiempo usando clock() (portable en Windows sin POSIX)
 * ----------------------------------------------------------------------- */
static double get_time_sec(void)
{
    return (double)clock() / (double)CLOCKS_PER_SEC;
}

/* -----------------------------------------------------------------------
 * Mezclar un arreglo (Fisher-Yates shuffle)
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
 * Ejecutar benchmark para N claves
 * ----------------------------------------------------------------------- */
static void run_benchmark(int N)
{
    printf("\n=======================================================================\n");
    printf("  BENCHMARK: T-Tree vs B-Tree con N = %d claves\n", N);
    printf("=======================================================================\n");

    /* Generar claves: valores pares 0,2,4,...,2*(N-1)
     * Asi los impares (1,3,5...) sirven como claves inexistentes */
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

    /* -----------------------------------------------------------------
     * 1. INSERCION ALEATORIA
     * ----------------------------------------------------------------- */

    /* T-Tree */
    TTree ttree = ttree_init();
    t0 = get_time_sec();
    for (int i = 0; i < N; i++) {
        ttree_insert(&ttree, shuffled[i], shuffled[i]);
    }
    t1 = get_time_sec();
    double ttree_insert_time = t1 - t0;

    /* B-Tree */
    BTree *btree = btree_create();
    t0 = get_time_sec();
    for (int i = 0; i < N; i++) {
        btree_insert(btree, (BTreeKey)shuffled[i]);
    }
    t1 = get_time_sec();
    double btree_insert_time = t1 - t0;

    /* -----------------------------------------------------------------
     * 2. BUSQUEDA EXACTA - EXITO (claves que SI existen)
     * ----------------------------------------------------------------- */
    int lookups = N > 100000 ? 100000 : N;

    /* T-Tree */
    t0 = get_time_sec();
    int tt_found = 0;
    for (int i = 0; i < lookups; i++) {
        int rowid;
        if (ttree_search(&ttree, keys[i], &rowid)) tt_found++;
    }
    t1 = get_time_sec();
    double ttree_search_hit = t1 - t0;

    /* B-Tree */
    t0 = get_time_sec();
    int bt_found = 0;
    for (int i = 0; i < lookups; i++) {
        if (btree_search(btree, (BTreeKey)keys[i])) bt_found++;
    }
    t1 = get_time_sec();
    double btree_search_hit = t1 - t0;

    /* -----------------------------------------------------------------
     * 3. BUSQUEDA EXACTA - FALLO (claves que NO existen)
     * ----------------------------------------------------------------- */

    /* T-Tree */
    t0 = get_time_sec();
    int tt_miss = 0;
    for (int i = 0; i < lookups; i++) {
        int rowid;
        if (!ttree_search(&ttree, keys[i] + 1, &rowid)) tt_miss++;
    }
    t1 = get_time_sec();
    double ttree_search_miss = t1 - t0;

    /* B-Tree */
    t0 = get_time_sec();
    int bt_miss = 0;
    for (int i = 0; i < lookups; i++) {
        if (!btree_search(btree, (BTreeKey)(keys[i] + 1))) bt_miss++;
    }
    t1 = get_time_sec();
    double btree_search_miss = t1 - t0;

    /* -----------------------------------------------------------------
     * 4. BUSQUEDA POR RANGO (solo B-Tree tiene API con retorno de count,
     *    T-Tree solo imprime, asi que medimos el tiempo de ambos)
     * ----------------------------------------------------------------- */
    int range_queries = 1000;
    int range_width = N / 10;  /* 10% del total */
    if (range_width < 1) range_width = 1;

    /* Buffer para resultados del B-Tree */
    BTreeKey *res_buffer = (BTreeKey *)malloc((size_t)(range_width * 2) * sizeof(BTreeKey));

    /* T-Tree: silenciamos stdout con _dup/_dup2 (Windows) para que
     * ttree_range_search no imprima miles de lineas en pantalla */
    t0 = get_time_sec();
    fflush(stdout);
    int saved_stdout = _dup(1);          /* guardar fd 1 (stdout) */
    FILE *fnul = fopen("NUL", "w");
    _dup2(_fileno(fnul), 1);             /* redirigir stdout a NUL */
    for (int q = 0; q < range_queries; q++) {
        int low = (rand() % (N > range_width ? (N - range_width) : 1)) * 2;
        int high = low + range_width;
        ttree_range_search(&ttree, low, high);
    }
    fflush(stdout);
    _dup2(saved_stdout, 1);              /* restaurar stdout original */
    _close(saved_stdout);
    fclose(fnul);
    t1 = get_time_sec();
    double ttree_range_time = t1 - t0;

    /* B-Tree */
    t0 = get_time_sec();
    size_t bt_range_total = 0;
    for (int q = 0; q < range_queries; q++) {
        int64_t low = (int64_t)((rand() % (N > range_width ? (N - range_width) : 1)) * 2);
        int64_t high = low + range_width;
        bt_range_total += btree_range_search(btree, low, high, res_buffer, (size_t)(range_width * 2));
    }
    t1 = get_time_sec();
    double btree_range_time = t1 - t0;

    /* -----------------------------------------------------------------
     * 5. MEMORIA ESTIMADA
     * ----------------------------------------------------------------- */
    size_t tt_node_size = sizeof(TNode);
    size_t bt_node_size = sizeof(BTreeNode);
    /* Estimacion: total de claves / claves por nodo = aprox nodos */
    size_t tt_est_nodes = (size_t)N; /* peor caso: 1 clave por nodo */
    size_t bt_est_nodes = btree->node_count;
    size_t tt_mem = tt_est_nodes * tt_node_size + sizeof(TTree);
    size_t bt_mem = bt_est_nodes * bt_node_size + sizeof(BTree);

    /* -----------------------------------------------------------------
     * RESULTADOS
     * ----------------------------------------------------------------- */
    printf("\n%-34s | %-16s | %-16s | %s\n",
           "Metrica", "T-Tree", "B-Tree", "Ganador");
    printf("-----------------------------------+------------------+------------------+------------------\n");

    printf("%-34s | %10.4f ms   | %10.4f ms   | %s (%.2fx)\n",
           "Insercion Aleatoria",
           ttree_insert_time * 1000.0,
           btree_insert_time * 1000.0,
           ttree_insert_time < btree_insert_time ? "T-Tree" : "B-Tree",
           ttree_insert_time < btree_insert_time
               ? btree_insert_time / ttree_insert_time
               : ttree_insert_time / btree_insert_time);

    printf("%-34s | %10.4f ms   | %10.4f ms   | %s (%.2fx)\n",
           "Busqueda Exitosa (Hit)",
           ttree_search_hit * 1000.0,
           btree_search_hit * 1000.0,
           ttree_search_hit < btree_search_hit ? "T-Tree" : "B-Tree",
           ttree_search_hit < btree_search_hit
               ? btree_search_hit / ttree_search_hit
               : ttree_search_hit / btree_search_hit);

    printf("%-34s | %10.4f ms   | %10.4f ms   | %s (%.2fx)\n",
           "Busqueda Fallida (Miss)",
           ttree_search_miss * 1000.0,
           btree_search_miss * 1000.0,
           ttree_search_miss < btree_search_miss ? "T-Tree" : "B-Tree",
           ttree_search_miss < btree_search_miss
               ? btree_search_miss / ttree_search_miss
               : ttree_search_miss / btree_search_miss);

    printf("%-34s | %10.4f ms   | %10.4f ms   | %s (%.2fx)\n",
           "Busqueda por Rango (1k queries)",
           ttree_range_time * 1000.0,
           btree_range_time * 1000.0,
           ttree_range_time < btree_range_time ? "T-Tree" : "B-Tree",
           ttree_range_time < btree_range_time
               ? btree_range_time / ttree_range_time
               : ttree_range_time / btree_range_time);

    printf("%-34s | %10.2f KB   | %10.2f KB   | %s (%.2fx)\n",
           "Memoria Estimada",
           (double)tt_mem / 1024.0,
           (double)bt_mem / 1024.0,
           tt_mem < bt_mem ? "T-Tree" : "B-Tree",
           tt_mem < bt_mem ? (double)bt_mem / (double)tt_mem : (double)tt_mem / (double)bt_mem);

    printf("%-34s | %10.2f B    | %10.2f B    | %s\n",
           "Bytes por Clave",
           (double)tt_mem / (double)N,
           (double)bt_mem / (double)N,
           tt_mem < bt_mem ? "T-Tree mas denso" : "B-Tree mas denso");

    printf("\n  Verificacion: T-Tree encontro %d/%d, B-Tree encontro %d/%d\n",
           tt_found, lookups, bt_found, lookups);
    printf("  Verificacion: T-Tree miss %d/%d, B-Tree miss %d/%d\n",
           tt_miss, lookups, bt_miss, lookups);

    /* Limpieza */
    free(res_buffer);
    free(keys);
    free(shuffled);
    ttree_destroy(&ttree);
    btree_destroy(btree);
}

int main(void)
{
    srand(42);
    printf("=======================================================================\n");
    printf("   ESTUDIO COMPARATIVO DE RENDIMIENTO: T-TREE vs B-TREE\n");
    printf("=======================================================================\n");

    run_benchmark(10000);
    run_benchmark(100000);
    run_benchmark(500000);

    return 0;
}
