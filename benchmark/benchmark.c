/*
 * benchmark.c — Benchmark & Efficiency Comparison: T-Tree vs B-Tree
 *
 * Proyecto Académico: Bases de Datos II
 * Compara:
 *   1. Tiempo de Inserción (Aleatorio y Secuencial)
 *   2. Tiempo de Búsqueda Exacta (Claves existentes y no existentes)
 *   3. Tiempo de Búsqueda por Rango (Rangos pequeños y grandes)
 *   4. Altura final y conteo de nodos
 *   5. Estimación de uso de memoria y eficiencia por clave
 */

#define _POSIX_C_SOURCE 199309L
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <time.h>
#include <string.h>

#include "../ttree/src/ttree.h"
#include "../btree/src/btree.h"

/* Medición de tiempo de alta precisión en nanosegundos / microsegundos */
static double get_time_sec(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec + (double)ts.tv_nsec * 1e-9;
}

/* Generador de claves aleatorias únicas */
static int64_t *generate_random_unique_keys(size_t n, int64_t max_val)
{
    int64_t *keys = (int64_t *)malloc(n * sizeof(int64_t));
    if (!keys) return NULL;

    /* Fisher-Yates shuffle o muestreo disperso */
    for (size_t i = 0; i < n; i++) {
        keys[i] = (int64_t)(((uint64_t)rand() << 32) | rand()) % max_val;
    }
    return keys;
}

/* Benchmark para una carga de trabajo */
static void run_benchmark(size_t N)
{
    printf("\n=======================================================================\n");
    printf("  BENCHMARK: Comparativa T-Tree vs B-Tree con N = %zu claves\n", N);
    printf("=======================================================================\n");

    int64_t *keys = (int64_t *)malloc(N * sizeof(int64_t));
    for (size_t i = 0; i < N; i++) {
        keys[i] = (int64_t)i * 2; /* valores pares para poder buscar impares como "no encontrados" */
    }

    /* Mezclar para inserción aleatoria */
    int64_t *shuffled = (int64_t *)malloc(N * sizeof(int64_t));
    memcpy(shuffled, keys, N * sizeof(int64_t));
    for (size_t i = N - 1; i > 0; i--) {
        size_t j = (size_t)rand() % (i + 1);
        int64_t tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
    }

    double t0, t1;

    /* ---------------------------------------------------------------------
     * 1. INSERCIÓN ALEATORIA
     * --------------------------------------------------------------------- */
    TTree *ttree = ttree_create();
    t0 = get_time_sec();
    for (size_t i = 0; i < N; i++) {
        ttree_insert(ttree, shuffled[i]);
    }
    t1 = get_time_sec();
    double ttree_insert_rand = t1 - t0;

    BTree *btree = btree_create();
    t0 = get_time_sec();
    for (size_t i = 0; i < N; i++) {
        btree_insert(btree, shuffled[i]);
    }
    t1 = get_time_sec();
    double btree_insert_rand = t1 - t0;

    /* ---------------------------------------------------------------------
     * 2. BÚSQUEDA EXACTA (Éxito)
     * --------------------------------------------------------------------- */
    size_t lookups = N > 100000 ? 100000 : N;
    
    t0 = get_time_sec();
    size_t tt_found = 0;
    for (size_t i = 0; i < lookups; i++) {
        if (ttree_search(ttree, keys[i])) tt_found++;
    }
    t1 = get_time_sec();
    double ttree_search_hit = t1 - t0;

    t0 = get_time_sec();
    size_t bt_found = 0;
    for (size_t i = 0; i < lookups; i++) {
        if (btree_search(btree, keys[i])) bt_found++;
    }
    t1 = get_time_sec();
    double btree_search_hit = t1 - t0;

    /* ---------------------------------------------------------------------
     * 3. BÚSQUEDA EXACTA (Fallo - Claves inexistentes)
     * --------------------------------------------------------------------- */
    t0 = get_time_sec();
    size_t tt_miss = 0;
    for (size_t i = 0; i < lookups; i++) {
        if (!ttree_search(ttree, keys[i] + 1)) tt_miss++;
    }
    t1 = get_time_sec();
    double ttree_search_miss = t1 - t0;

    t0 = get_time_sec();
    size_t bt_miss = 0;
    for (size_t i = 0; i < lookups; i++) {
        if (!btree_search(btree, keys[i] + 1)) bt_miss++;
    }
    t1 = get_time_sec();
    double btree_search_miss = t1 - t0;

    /* ---------------------------------------------------------------------
     * 4. BÚSQUEDA POR RANGO
     * --------------------------------------------------------------------- */
    size_t range_queries = 1000;
    int64_t range_width = (int64_t)(N / 10); /* 10% del total */
    BTreeKey *res_buffer = (BTreeKey *)malloc((size_t)range_width * 2 * sizeof(BTreeKey));

    t0 = get_time_sec();
    size_t tt_range_total = 0;
    for (size_t q = 0; q < range_queries; q++) {
        int64_t low = (int64_t)(rand() % (N > range_width ? (N - range_width) : 1)) * 2;
        int64_t high = low + range_width;
        tt_range_total += ttree_range_search(ttree, low, high, res_buffer, (size_t)range_width * 2);
    }
    t1 = get_time_sec();
    double ttree_range_time = t1 - t0;

    t0 = get_time_sec();
    size_t bt_range_total = 0;
    for (size_t q = 0; q < range_queries; q++) {
        int64_t low = (int64_t)(rand() % (N > range_width ? (N - range_width) : 1)) * 2;
        int64_t high = low + range_width;
        bt_range_total += btree_range_search(btree, low, high, res_buffer, (size_t)range_width * 2);
    }
    t1 = get_time_sec();
    double btree_range_time = t1 - t0;

    /* ---------------------------------------------------------------------
     * 5. ESTRUCTURA Y MEMORIA
     * --------------------------------------------------------------------- */
    size_t tt_node_size = sizeof(TTreeNode);
    size_t bt_node_size = sizeof(BTreeNode);
    size_t tt_mem_bytes = ttree->node_count * tt_node_size + sizeof(TTree);
    size_t bt_mem_bytes = btree->node_count * bt_node_size + sizeof(BTree);

    printf("\n--- RESULTADOS METRICAS ---\n");
    printf("%-32s | %-16s | %-16s | %s\n", "Métrica", "T-Tree", "B-Tree", "Ganador / Ratio");
    printf("---------------------------------+------------------+------------------+------------------\n");
    
    printf("%-32s | %10.4f ms   | %10.4f ms   | %s (%.2fx)\n",
           "Inserción Aleatoria",
           ttree_insert_rand * 1000.0,
           btree_insert_rand * 1000.0,
           ttree_insert_rand < btree_insert_rand ? "T-Tree" : "B-Tree",
           ttree_insert_rand < btree_insert_rand ? btree_insert_rand / ttree_insert_rand : ttree_insert_rand / btree_insert_rand);

    printf("%-32s | %10.4f ms   | %10.4f ms   | %s (%.2fx)\n",
           "Búsqueda Exitosa (Hit)",
           ttree_search_hit * 1000.0,
           btree_search_hit * 1000.0,
           ttree_search_hit < btree_search_hit ? "T-Tree" : "B-Tree",
           ttree_search_hit < btree_search_hit ? btree_search_hit / ttree_search_hit : ttree_search_hit / btree_search_hit);

    printf("%-32s | %10.4f ms   | %10.4f ms   | %s (%.2fx)\n",
           "Búsqueda Fallida (Miss)",
           ttree_search_miss * 1000.0,
           btree_search_miss * 1000.0,
           ttree_search_miss < btree_search_miss ? "T-Tree" : "B-Tree",
           ttree_search_miss < btree_search_miss ? btree_search_miss / ttree_search_miss : ttree_search_miss / btree_search_miss);

    printf("%-32s | %10.4f ms   | %10.4f ms   | %s (%.2fx)\n",
           "Búsqueda por Rango (1k queries)",
           ttree_range_time * 1000.0,
           btree_range_time * 1000.0,
           ttree_range_time < btree_range_time ? "T-Tree" : "B-Tree",
           ttree_range_time < btree_range_time ? btree_range_time / ttree_range_time : ttree_range_time / btree_range_time);

    printf("%-32s | %13d    | %13d    | %s\n",
           "Altura del Árbol",
           ttree_height(ttree),
           btree_height(btree),
           ttree_height(ttree) < btree_height(btree) ? "T-Tree más bajo" : "B-Tree más bajo");

    printf("%-32s | %13zu    | %13zu    | %s\n",
           "Total de Nodos",
           ttree->node_count,
           btree->node_count,
           ttree->node_count < btree->node_count ? "T-Tree menos nodos" : "B-Tree menos nodos");

    printf("%-32s | %10.2f KB   | %10.2f KB   | %s (%.2fx)\n",
           "Memoria Total (estimada)",
           (double)tt_mem_bytes / 1024.0,
           (double)bt_mem_bytes / 1024.0,
           tt_mem_bytes < bt_mem_bytes ? "T-Tree" : "B-Tree",
           tt_mem_bytes < bt_mem_bytes ? (double)bt_mem_bytes / tt_mem_bytes : (double)tt_mem_bytes / bt_mem_bytes);

    printf("%-32s | %10.2f B    | %10.2f B    | %s\n",
           "Bytes por Clave",
           (double)tt_mem_bytes / (double)N,
           (double)bt_mem_bytes / (double)N,
           tt_mem_bytes < bt_mem_bytes ? "T-Tree más denso" : "B-Tree más denso");

    /* Limpieza */
    free(res_buffer);
    free(keys);
    free(shuffled);
    ttree_destroy(ttree);
    btree_destroy(btree);
}

int main(void)
{
    srand(42);
    printf("=======================================================================\n");
    printf("   ESTUDIO COMPARATIVO DE RENDIMIENTO: T-TREE vs B-TREE EN C\n");
    printf("=======================================================================\n");

    run_benchmark(10000);
    run_benchmark(100000);
    run_benchmark(500000);

    return 0;
}
