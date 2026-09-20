/*
 * test_ttree.c — Suite de pruebas automáticas del T-Tree
 *
 * Proyecto Académico: Bases de Datos II
 *
 * Compilar y ejecutar:
 *   make test
 *
 * Cada prueba imprime PASS o FAIL.
 * Al final se muestra un resumen total.
 */

#include "../src/ttree.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>

/* =========================================================================
 * FRAMEWORK DE PRUEBAS MÍNIMO
 * ========================================================================= */

static int tests_run    = 0;
static int tests_passed = 0;
static int tests_failed = 0;

#define TEST_BEGIN(name) \
    do { \
        tests_run++; \
        printf("  %-55s ", name); \
        fflush(stdout); \
    } while (0)

#define TEST_PASS() \
    do { \
        tests_passed++; \
        printf("PASS\n"); \
    } while (0)

#define TEST_FAIL(msg) \
    do { \
        tests_failed++; \
        printf("FAIL  [%s]\n", msg); \
    } while (0)

#define ASSERT_TRUE(cond, msg) \
    do { \
        if (!(cond)) { TEST_FAIL(msg); goto cleanup; } \
    } while (0)

#define ASSERT_FALSE(cond, msg) \
    do { \
        if (cond)  { TEST_FAIL(msg); goto cleanup; } \
    } while (0)

#define ASSERT_EQ(a, b, msg) \
    do { \
        if ((a) != (b)) { \
            char buf[128]; \
            snprintf(buf, sizeof(buf), msg " (got %lld, expected %lld)", \
                     (long long)(a), (long long)(b)); \
            TEST_FAIL(buf); \
            goto cleanup; \
        } \
    } while (0)

/* =========================================================================
 * COMPARADOR PARA qsort
 * ========================================================================= */

static int cmp_i64(const void *a, const void *b)
{
    int64_t x = *(const int64_t *)a;
    int64_t y = *(const int64_t *)b;
    return (x > y) - (x < y);
}

/* =========================================================================
 * PRUEBA 1 — Árbol vacío
 * ========================================================================= */
static void test1_empty_tree(void)
{
    printf("\n--- Prueba 1: Árbol vacío ---\n");

    TTree *t = NULL;

    TEST_BEGIN("crear árbol vacío devuelve no NULL");
    t = ttree_create();
    ASSERT_TRUE(t != NULL, "ttree_create() devolvió NULL");
    TEST_PASS();

    TEST_BEGIN("size inicial es 0");
    ASSERT_EQ(ttree_size(t), 0, "size != 0");
    TEST_PASS();

    TEST_BEGIN("height inicial es 0");
    ASSERT_EQ(ttree_height(t), 0, "height != 0");
    TEST_PASS();

    TEST_BEGIN("buscar en árbol vacío devuelve false");
    ASSERT_FALSE(ttree_search(t, 42), "search en vacío devolvió true");
    TEST_PASS();

    TEST_BEGIN("validate árbol vacío devuelve true");
    ASSERT_TRUE(ttree_validate(t), "validate falló en árbol vacío");
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 2 — Inserción básica
 * ========================================================================= */
static void test2_basic_insert(void)
{
    printf("\n--- Prueba 2: Inserción básica ---\n");

    TTree *t = NULL;
    int64_t keys[] = {50, 20, 80, 10, 30, 60, 90};
    int n = (int)(sizeof(keys) / sizeof(keys[0]));

    TEST_BEGIN("crear árbol");
    t = ttree_create();
    ASSERT_TRUE(t != NULL, "create falló");
    TEST_PASS();

    TEST_BEGIN("insertar 7 claves distintas devuelve true");
    bool all_ok = true;
    for (int i = 0; i < n; i++) {
        if (!ttree_insert(t, keys[i])) { all_ok = false; break; }
    }
    ASSERT_TRUE(all_ok, "alguna inserción devolvió false");
    TEST_PASS();

    TEST_BEGIN("size después de inserción es 7");
    ASSERT_EQ((int64_t)ttree_size(t), 7, "size incorrecto");
    TEST_PASS();

    TEST_BEGIN("validate después de inserción");
    ASSERT_TRUE(ttree_validate(t), "validate falló post-inserción");
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 3 — Búsqueda exitosa
 * ========================================================================= */
static void test3_search_found(void)
{
    printf("\n--- Prueba 3: Búsqueda exitosa ---\n");

    TTree *t = NULL;
    int64_t keys[] = {50, 20, 80, 10, 30, 60, 90};
    int n = (int)(sizeof(keys) / sizeof(keys[0]));

    t = ttree_create();
    if (!t) return;
    for (int i = 0; i < n; i++) ttree_insert(t, keys[i]);

    TEST_BEGIN("buscar 50 → true");
    ASSERT_TRUE(ttree_search(t, 50), "50 no encontrado");
    TEST_PASS();

    TEST_BEGIN("buscar 10 → true");
    ASSERT_TRUE(ttree_search(t, 10), "10 no encontrado");
    TEST_PASS();

    TEST_BEGIN("buscar 90 → true");
    ASSERT_TRUE(ttree_search(t, 90), "90 no encontrado");
    TEST_PASS();

    TEST_BEGIN("buscar 20 → true");
    ASSERT_TRUE(ttree_search(t, 20), "20 no encontrado");
    TEST_PASS();

    TEST_BEGIN("buscar 30 → true");
    ASSERT_TRUE(ttree_search(t, 30), "30 no encontrado");
    TEST_PASS();

    TEST_BEGIN("buscar 60 → true");
    ASSERT_TRUE(ttree_search(t, 60), "60 no encontrado");
    TEST_PASS();

    TEST_BEGIN("buscar 80 → true");
    ASSERT_TRUE(ttree_search(t, 80), "80 no encontrado");
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 4 — Búsqueda fallida
 * ========================================================================= */
static void test4_search_not_found(void)
{
    printf("\n--- Prueba 4: Búsqueda fallida ---\n");

    TTree *t = NULL;
    int64_t keys[] = {50, 20, 80, 10, 30, 60, 90};
    int n = (int)(sizeof(keys) / sizeof(keys[0]));

    t = ttree_create();
    if (!t) return;
    for (int i = 0; i < n; i++) ttree_insert(t, keys[i]);

    int64_t absent[] = {0, 5, 15, 25, 35, 55, 70, 85, 100, -1, 999};
    int m = (int)(sizeof(absent) / sizeof(absent[0]));

    TEST_BEGIN("claves ausentes no se encuentran (11 claves)");
    bool all_absent = true;
    for (int i = 0; i < m; i++) {
        if (ttree_search(t, absent[i])) { all_absent = false; break; }
    }
    ASSERT_TRUE(all_absent, "alguna clave ausente fue encontrada");
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 5 — Duplicados rechazados
 * ========================================================================= */
static void test5_duplicates(void)
{
    printf("\n--- Prueba 5: Duplicados ---\n");

    TTree *t = NULL;

    TEST_BEGIN("insertar 42 por primera vez → true");
    t = ttree_create();
    ASSERT_TRUE(t != NULL, "create falló");
    ASSERT_TRUE(ttree_insert(t, 42), "primera inserción falló");
    TEST_PASS();

    TEST_BEGIN("insertar 42 segunda vez → false (duplicado)");
    ASSERT_FALSE(ttree_insert(t, 42), "duplicado no fue rechazado");
    TEST_PASS();

    TEST_BEGIN("size sigue siendo 1 después del duplicado");
    ASSERT_EQ((int64_t)ttree_size(t), 1, "size cambió tras duplicado");
    TEST_PASS();

    TEST_BEGIN("insertar 5 claves y reintentar todas → false");
    int64_t kk[] = {1, 2, 3, 4, 5};
    for (int i = 0; i < 5; i++) ttree_insert(t, kk[i]);
    bool all_rej = true;
    for (int i = 0; i < 5; i++) {
        if (ttree_insert(t, kk[i])) { all_rej = false; break; }
    }
    ASSERT_TRUE(all_rej, "algún duplicado no fue rechazado");
    TEST_PASS();

    TEST_BEGIN("validate post-duplicados");
    ASSERT_TRUE(ttree_validate(t), "validate falló");
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 6 — Inserciones desordenadas
 * ========================================================================= */
static void test6_random_order(void)
{
    printf("\n--- Prueba 6: Inserciones desordenadas ---\n");

    TTree *t = NULL;
    const int N = 200;
    int64_t data[200];

    /* Generar valores únicos en orden pseudo-aleatorio */
    for (int i = 0; i < N; i++) data[i] = (int64_t)i * 7 + 3;  /* no ordenados por valor */

    /* Barajar con Fisher-Yates */
    srand(12345);
    for (int i = N - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        int64_t tmp = data[i]; data[i] = data[j]; data[j] = tmp;
    }

    TEST_BEGIN("insertar 200 valores en orden aleatorio");
    t = ttree_create();
    ASSERT_TRUE(t != NULL, "create falló");
    bool all_ok = true;
    for (int i = 0; i < N; i++) {
        if (!ttree_insert(t, data[i])) { all_ok = false; break; }
    }
    ASSERT_TRUE(all_ok, "alguna inserción falló");
    TEST_PASS();

    TEST_BEGIN("size == 200");
    ASSERT_EQ((int64_t)ttree_size(t), N, "size incorrecto");
    TEST_PASS();

    TEST_BEGIN("todos los valores son encontrados");
    bool all_found = true;
    for (int i = 0; i < N; i++) {
        if (!ttree_search(t, data[i])) { all_found = false; break; }
    }
    ASSERT_TRUE(all_found, "algún valor no fue encontrado");
    TEST_PASS();

    TEST_BEGIN("validate estructura después de inserciones aleatorias");
    ASSERT_TRUE(ttree_validate(t), "validate falló");
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 7 — Búsqueda por rango
 * ========================================================================= */
static void test7_range_search(void)
{
    printf("\n--- Prueba 7: Búsqueda por rango ---\n");

    TTree *t = NULL;
    /* Insertar 1..100 */
    t = ttree_create();
    if (!t) return;
    for (int i = 1; i <= 100; i++) ttree_insert(t, (int64_t)i);

    int64_t results[200];
    size_t  found;

    TEST_BEGIN("rango [10, 50]: exactamente 41 resultados");
    found = ttree_range_search(t, 10, 50, results, 200);
    ASSERT_EQ((int64_t)found, 41, "count incorrecto");
    TEST_PASS();

    TEST_BEGIN("rango [10, 50]: todos en rango [10..50]");
    bool in_range = true;
    for (size_t i = 0; i < found; i++) {
        if (results[i] < 10 || results[i] > 50) { in_range = false; break; }
    }
    ASSERT_TRUE(in_range, "algún resultado fuera de rango");
    TEST_PASS();

    TEST_BEGIN("rango [10, 50]: sin duplicados");
    qsort(results, found, sizeof(int64_t), cmp_i64);
    bool no_dups = true;
    for (size_t i = 1; i < found; i++) {
        if (results[i] == results[i-1]) { no_dups = false; break; }
    }
    ASSERT_TRUE(no_dups, "hay duplicados en el resultado");
    TEST_PASS();

    TEST_BEGIN("rango [1, 100]: 100 resultados");
    found = ttree_range_search(t, 1, 100, results, 200);
    ASSERT_EQ((int64_t)found, 100, "count incorrecto para rango completo");
    TEST_PASS();

    TEST_BEGIN("rango [-5, 0]: 0 resultados");
    found = ttree_range_search(t, -5, 0, results, 200);
    ASSERT_EQ((int64_t)found, 0, "debería haber 0 resultados");
    TEST_PASS();

    TEST_BEGIN("rango [50, 50]: 1 resultado (búsqueda puntual)");
    found = ttree_range_search(t, 50, 50, results, 200);
    ASSERT_EQ((int64_t)found, 1, "debería haber exactamente 1 resultado");
    ASSERT_TRUE(found == 1 && results[0] == 50, "resultado incorrecto");
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 8 — Caso secuencial ascendente (1..1000)
 * ========================================================================= */
static void test8_sequential_asc(void)
{
    printf("\n--- Prueba 8: Caso secuencial 1..1000 ---\n");

    TTree *t = NULL;
    const int N = 1000;

    TEST_BEGIN("insertar 1..1000 en orden ascendente");
    t = ttree_create();
    ASSERT_TRUE(t != NULL, "create falló");
    for (int i = 1; i <= N; i++) ttree_insert(t, (int64_t)i);
    ASSERT_EQ((int64_t)ttree_size(t), N, "size incorrecto");
    TEST_PASS();

    TEST_BEGIN("validate post-inserción secuencial");
    ASSERT_TRUE(ttree_validate(t), "validate falló");
    TEST_PASS();

    TEST_BEGIN("todos los valores 1..1000 encontrados");
    bool ok = true;
    for (int i = 1; i <= N; i++) {
        if (!ttree_search(t, (int64_t)i)) { ok = false; break; }
    }
    ASSERT_TRUE(ok, "algún valor no encontrado");
    TEST_PASS();

    TEST_BEGIN("altura del árbol es O(log n) — menor a 30");
    int h = ttree_height(t);
    ASSERT_TRUE(h < 30, "altura excesiva (no balanceado)");
    printf("  [info: altura = %d] ", h);
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 9 — Caso secuencial descendente (1000..1)
 * ========================================================================= */
static void test9_sequential_desc(void)
{
    printf("\n--- Prueba 9: Caso secuencial 1000..1 ---\n");

    TTree *t = NULL;
    const int N = 1000;

    TEST_BEGIN("insertar 1000..1 en orden descendente");
    t = ttree_create();
    ASSERT_TRUE(t != NULL, "create falló");
    for (int i = N; i >= 1; i--) ttree_insert(t, (int64_t)i);
    ASSERT_EQ((int64_t)ttree_size(t), N, "size incorrecto");
    TEST_PASS();

    TEST_BEGIN("validate post-inserción descendente");
    ASSERT_TRUE(ttree_validate(t), "validate falló");
    TEST_PASS();

    TEST_BEGIN("todos los valores 1..1000 encontrados");
    bool ok = true;
    for (int i = 1; i <= N; i++) {
        if (!ttree_search(t, (int64_t)i)) { ok = false; break; }
    }
    ASSERT_TRUE(ok, "algún valor no encontrado");
    TEST_PASS();

    TEST_BEGIN("altura del árbol es O(log n) — menor a 30");
    int h = ttree_height(t);
    ASSERT_TRUE(h < 30, "árbol no balanceado");
    printf("  [info: altura = %d] ", h);
    TEST_PASS();

cleanup:
    ttree_destroy(t);
}

/* =========================================================================
 * PRUEBA 10 — Memoria: crear y destruir múltiples árboles
 * ========================================================================= */
static void test10_memory(void)
{
    printf("\n--- Prueba 10: Memoria ---\n");

    TEST_BEGIN("crear y destruir 50 árboles con 500 claves cada uno");
    bool ok = true;
    for (int trial = 0; trial < 50; trial++) {
        TTree *t = ttree_create();
        if (!t) { ok = false; break; }

        srand((unsigned)trial * 31 + 7);
        for (int i = 0; i < 500; i++) {
            int64_t k = (int64_t)(rand() % 10000);
            ttree_insert(t, k);
        }

        if (!ttree_validate(t)) { ok = false; ttree_destroy(t); break; }
        ttree_destroy(t);
    }
    ASSERT_TRUE(ok, "fallo en alguna iteración");
    TEST_PASS();

    TEST_BEGIN("árbol destruido con NULL no causa crash");
    ttree_destroy(NULL);  /* no debe crashear */
    TEST_PASS();

    TEST_BEGIN("ttree_build con array de 100 elementos");
    int64_t arr[100];
    for (int i = 0; i < 100; i++) arr[i] = (int64_t)(i * 3 - 50);
    TTree *t = ttree_build(arr, 100);
    ASSERT_TRUE(t != NULL, "ttree_build falló");
    ASSERT_EQ((int64_t)ttree_size(t), 100, "size incorrecto post-build");
    ASSERT_TRUE(ttree_validate(t), "validate falló post-build");
    ttree_destroy(t);
    TEST_PASS();

    return;
cleanup:
    ; /* para ASSERT_TRUE macro */
}

/* =========================================================================
 * PRUEBA EXTRA — Verificación de impresión (visual)
 * ========================================================================= */
static void test_extra_print(void)
{
    printf("\n--- Prueba extra: ttree_print (visual) ---\n");
    TTree *t = ttree_create();
    if (!t) return;
    int64_t keys[] = {50, 20, 80, 10, 30, 60, 90, 5, 15};
    for (int i = 0; i < 9; i++) ttree_insert(t, keys[i]);
    ttree_print(t);
    ttree_destroy(t);
}

/* =========================================================================
 * MAIN
 * ========================================================================= */
int main(void)
{
    printf("=========================================================\n");
    printf("  T-Tree — Suite de Pruebas Automáticas\n");
    printf("  TTREE_NODE_MIN=%d  TTREE_NODE_MAX=%d\n",
           TTREE_NODE_MIN, TTREE_NODE_MAX);
    printf("=========================================================\n");

    test1_empty_tree();
    test2_basic_insert();
    test3_search_found();
    test4_search_not_found();
    test5_duplicates();
    test6_random_order();
    test7_range_search();
    test8_sequential_asc();
    test9_sequential_desc();
    test10_memory();
    test_extra_print();

    printf("\n=========================================================\n");
    printf("  RESULTADO: %d/%d pruebas pasadas",
           tests_passed, tests_run);
    if (tests_failed > 0)
        printf("  (%d FALLIDAS)", tests_failed);
    printf("\n=========================================================\n");

    return (tests_failed == 0) ? 0 : 1;
}
