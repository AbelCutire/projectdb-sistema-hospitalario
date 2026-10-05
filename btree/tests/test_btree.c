/*
 * test_btree.c — Test Suite for B-Tree (Analogue to test_ttree.c)
 */

#include "../src/btree.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>

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

static int cmp_i64(const void *a, const void *b)
{
    int64_t x = *(const int64_t *)a;
    int64_t y = *(const int64_t *)b;
    return (x > y) - (x < y);
}

/* =========================================================================
 * PRUEBA 1 - ARBOL VACIO
 * ========================================================================= */
static void test1_empty_tree(void)
{
    printf("\n--- Prueba 1: Árbol B vacío ---\n");
    BTree *t = NULL;

    TEST_BEGIN("crear árbol vacío devuelve no NULL");
    t = btree_create();
    ASSERT_TRUE(t != NULL, "btree_create() devolvió NULL");
    TEST_PASS();

    TEST_BEGIN("size inicial es 0");
    ASSERT_EQ(btree_size(t), 0, "size != 0");
    TEST_PASS();

    TEST_BEGIN("height inicial es 0");
    ASSERT_EQ(btree_height(t), 0, "height != 0");
    TEST_PASS();

    TEST_BEGIN("buscar en árbol vacío devuelve false");
    ASSERT_FALSE(btree_search(t, 42), "search en vacío devolvió true");
    TEST_PASS();

    TEST_BEGIN("validate árbol vacío devuelve true");
    ASSERT_TRUE(btree_validate(t), "validate falló en árbol vacío");
    TEST_PASS();

cleanup:
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 2 - INSERCION
 * ========================================================================= */
static void test2_basic_insert(void)
{
    printf("\n--- Prueba 2: Inserción básica en B-Tree ---\n");
    BTree *t = NULL;
    int64_t keys[] = {50, 20, 80, 10, 30, 60, 90};
    int n = (int)(sizeof(keys) / sizeof(keys[0]));

    TEST_BEGIN("crear árbol");
    t = btree_create();
    ASSERT_TRUE(t != NULL, "create falló");
    TEST_PASS();

    TEST_BEGIN("insertar 7 claves distintas devuelve true");
    bool all_ok = true;
    for (int i = 0; i < n; i++) {
        if (!btree_insert(t, keys[i])) { all_ok = false; break; }
    }
    ASSERT_TRUE(all_ok, "alguna inserción devolvió false");
    TEST_PASS();

    TEST_BEGIN("size después de inserción es 7");
    ASSERT_EQ((int64_t)btree_size(t), 7, "size incorrecto");
    TEST_PASS();

    TEST_BEGIN("validate después de inserción");
    ASSERT_TRUE(btree_validate(t), "validate falló post-inserción");
    TEST_PASS();

cleanup:
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 3 - BUSQUEDA
 * ========================================================================= */
static void test3_search_found(void)
{
    printf("\n--- Prueba 3: Búsqueda exitosa en B-Tree ---\n");
    BTree *t = NULL;
    int64_t keys[] = {50, 20, 80, 10, 30, 60, 90};
    int n = (int)(sizeof(keys) / sizeof(keys[0]));

    t = btree_create();
    if (!t) return;
    for (int i = 0; i < n; i++) btree_insert(t, keys[i]);

    for (int i = 0; i < n; i++) {
        char buf[64];
        snprintf(buf, sizeof(buf), "buscar %lld → true", (long long)keys[i]);
        TEST_BEGIN(buf);
        bool found = btree_search(t, keys[i]);
        ASSERT_TRUE(found, "no se encontró la clave");
        TEST_PASS();
    }

cleanup:
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 4 - BUSQUEDA FALLIDA
 * ========================================================================= */
static void test4_search_not_found(void)
{
    printf("\n--- Prueba 4: Búsqueda fallida en B-Tree ---\n");
    BTree *t = NULL;
    int64_t keys[] = {50, 20, 80, 10, 30, 60, 90};
    int64_t missing[] = {5, 15, 25, 35, 55, 65, 85, 95, 0, 100, -10};
    int n = (int)(sizeof(keys) / sizeof(keys[0]));
    int m = (int)(sizeof(missing) / sizeof(missing[0]));

    t = btree_create();
    if (!t) return;
    for (int i = 0; i < n; i++) btree_insert(t, keys[i]);

    TEST_BEGIN("claves ausentes no se encuentran");
    bool all_not_found = true;
    for (int i = 0; i < m; i++) {
        if (btree_search(t, missing[i])) { all_not_found = false; break; }
    }
    ASSERT_TRUE(all_not_found, "se encontró una clave ausente");
    TEST_PASS();

cleanup:
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 5 - DUPLICADOS
 * ========================================================================= */
static void test5_duplicates(void)
{
    printf("\n--- Prueba 5: Manejo de duplicados en B-Tree ---\n");
    BTree *t = btree_create();
    if (!t) return;

    TEST_BEGIN("insertar 42 por primera vez → true");
    ASSERT_TRUE(btree_insert(t, 42), "primera inserción falló");
    TEST_PASS();

    TEST_BEGIN("insertar 42 segunda vez → false (duplicado)");
    ASSERT_FALSE(btree_insert(t, 42), "inserción duplicada devolvió true");
    TEST_PASS();

    TEST_BEGIN("size sigue siendo 1 después del duplicado");
    ASSERT_EQ((int64_t)btree_size(t), 1, "size cambió");
    TEST_PASS();

    TEST_BEGIN("insertar 5 claves y reintentar todas → false");
    int64_t batch[] = {10, 20, 30, 40, 50};
    for (int i = 0; i < 5; i++) btree_insert(t, batch[i]);
    bool dup_ok = true;
    for (int i = 0; i < 5; i++) {
        if (btree_insert(t, batch[i])) { dup_ok = false; break; }
    }
    ASSERT_TRUE(dup_ok, "algún duplicado fue aceptado");
    TEST_PASS();

    TEST_BEGIN("validate post-duplicados");
    ASSERT_TRUE(btree_validate(t), "validate falló");
    TEST_PASS();

cleanup:
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 6 - ORDEN ALEATORIO
 * ========================================================================= */
static void test6_random_order(void)
{
    printf("\n--- Prueba 6: Inserciones desordenadas (200 valores) ---\n");
    BTree *t = btree_create();
    if (!t) return;

    int count = 200;
    int64_t *vals = (int64_t *)malloc(count * sizeof(int64_t));
    if (!vals) { btree_destroy(t); return; }

    srand(1337);
    for (int i = 0; i < count; i++) {
        vals[i] = (int64_t)(rand() % 5000);
    }

    TEST_BEGIN("insertar 200 valores en orden aleatorio");
    for (int i = 0; i < count; i++) {
        btree_insert(t, vals[i]);
    }
    TEST_PASS();

    TEST_BEGIN("size == número de claves únicas insertadas");
    qsort(vals, count, sizeof(int64_t), cmp_i64);
    size_t unique = 0;
    for (int i = 0; i < count; i++) {
        if (i == 0 || vals[i] != vals[i-1]) unique++;
    }
    ASSERT_EQ((int64_t)btree_size(t), (int64_t)unique, "size no coincide con únicos");
    TEST_PASS();

    TEST_BEGIN("todos los valores únicos son encontrados");
    bool found_all = true;
    for (int i = 0; i < count; i++) {
        if (i > 0 && vals[i] == vals[i-1]) continue;
        if (!btree_search(t, vals[i])) { found_all = false; break; }
    }
    ASSERT_TRUE(found_all, "algún valor único no se encontró");
    TEST_PASS();

    TEST_BEGIN("validate estructura después de inserciones aleatorias");
    ASSERT_TRUE(btree_validate(t), "validate falló");
    TEST_PASS();

cleanup:
    free(vals);
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 7 - RANGO
 * ========================================================================= */
static void test7_range_search(void)
{
    printf("\n--- Prueba 7: Búsqueda por rango en B-Tree ---\n");
    BTree *t = btree_create();
    if (!t) return;

    /* Insertar 1..100 */
    for (int64_t i = 1; i <= 100; i++) {
        btree_insert(t, i);
    }

    BTreeKey results[200];

    TEST_BEGIN("rango [10, 50]: exactamente 41 resultados");
    size_t count = btree_range_search(t, 10, 50, results, 200);
    ASSERT_EQ((int64_t)count, 41, "cantidad en rango incorrecta");
    TEST_PASS();

    TEST_BEGIN("rango [10, 50]: todos en rango [10..50]");
    bool range_ok = true;
    for (size_t i = 0; i < count; i++) {
        if (results[i] < 10 || results[i] > 50) { range_ok = false; break; }
    }
    ASSERT_TRUE(range_ok, "elemento fuera de rango encontrado");
    TEST_PASS();

    TEST_BEGIN("rango [10, 50]: sin duplicados y ordenados");
    bool sorted_ok = true;
    for (size_t i = 1; i < count; i++) {
        if (results[i] <= results[i-1]) { sorted_ok = false; break; }
    }
    ASSERT_TRUE(sorted_ok, "resultados no ordenados estrictamente");
    TEST_PASS();

    TEST_BEGIN("rango [1, 100]: 100 resultados");
    count = btree_range_search(t, 1, 100, results, 200);
    ASSERT_EQ((int64_t)count, 100, "rango completo incorrecto");
    TEST_PASS();

    TEST_BEGIN("rango [-5, 0]: 0 resultados");
    count = btree_range_search(t, -5, 0, results, 200);
    ASSERT_EQ((int64_t)count, 0, "rango vacío devolvió resultados");
    TEST_PASS();

    TEST_BEGIN("rango [50, 50]: 1 resultado (búsqueda puntual)");
    count = btree_range_search(t, 50, 50, results, 200);
    ASSERT_EQ((int64_t)count, 1, "búsqueda puntual por rango falló");
    ASSERT_EQ(results[0], 50, "valor puntual incorrecto");
    TEST_PASS();

cleanup:
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 8 - SECUENCIAL ASCENDENTE
 * ========================================================================= */
static void test8_sequential_asc(void)
{
    printf("\n--- Prueba 8: Caso secuencial 1..1000 (B-Tree) ---\n");
    BTree *t = btree_create();
    if (!t) return;

    TEST_BEGIN("insertar 1..1000 en orden ascendente");
    for (int64_t i = 1; i <= 1000; i++) {
        btree_insert(t, i);
    }
    TEST_PASS();

    TEST_BEGIN("validate post-inserción secuencial");
    ASSERT_TRUE(btree_validate(t), "validate falló");
    TEST_PASS();

    TEST_BEGIN("todos los valores 1..1000 encontrados");
    bool found_all = true;
    for (int64_t i = 1; i <= 1000; i++) {
        if (!btree_search(t, i)) { found_all = false; break; }
    }
    ASSERT_TRUE(found_all, "algún valor faltante");
    TEST_PASS();

    char msg[64];
    int h = btree_height(t);
    snprintf(msg, sizeof(msg), "[info: altura = %d] PASS", h);
    TEST_BEGIN("altura del árbol es O(log n)");
    ASSERT_TRUE(h > 0 && h < 25, "altura fuera de rango esperado");
    TEST_PASS();

cleanup:
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 9 - SECUENCIAL DESCENDENTE
 * ========================================================================= */
static void test9_sequential_desc(void)
{
    printf("\n--- Prueba 9: Caso secuencial 1000..1 (B-Tree) ---\n");
    BTree *t = btree_create();
    if (!t) return;

    TEST_BEGIN("insertar 1000..1 en orden descendente");
    for (int64_t i = 1000; i >= 1; i--) {
        btree_insert(t, i);
    }
    TEST_PASS();

    TEST_BEGIN("validate post-inserción descendente");
    ASSERT_TRUE(btree_validate(t), "validate falló");
    TEST_PASS();

    TEST_BEGIN("todos los valores 1..1000 encontrados");
    bool found_all = true;
    for (int64_t i = 1; i <= 1000; i++) {
        if (!btree_search(t, i)) { found_all = false; break; }
    }
    ASSERT_TRUE(found_all, "algún valor faltante");
    TEST_PASS();

    char msg[64];
    int h = btree_height(t);
    snprintf(msg, sizeof(msg), "[info: altura = %d] PASS", h);
    TEST_BEGIN("altura del árbol es O(log n)");
    ASSERT_TRUE(h > 0 && h < 25, "altura fuera de rango esperado");
    TEST_PASS();

cleanup:
    btree_destroy(t);
}

/* =========================================================================
 * PRUEBA 10 - MEMORIA
 * ========================================================================= */
static void test10_memory(void)
{
    printf("\n--- Prueba 10: Estrés de memoria y btree_build ---\n");

    TEST_BEGIN("crear y destruir 50 árboles con 500 claves cada uno");
    bool mem_ok = true;
    for (int iter = 0; iter < 50; iter++) {
        BTree *t = btree_create();
        if (!t) { mem_ok = false; break; }
        for (int i = 0; i < 500; i++) {
            btree_insert(t, (int64_t)((iter * 73 + i * 37) % 10000));
        }
        btree_destroy(t);
    }
    ASSERT_TRUE(mem_ok, "falló creación/destrucción masiva");
    TEST_PASS();

    TEST_BEGIN("árbol destruido con NULL no causa crash");
    btree_destroy(NULL);
    TEST_PASS();

    TEST_BEGIN("btree_build con array de 100 elementos");
    int64_t arr[100];
    for (int i = 0; i < 100; i++) arr[i] = (int64_t)(i * 3);
    BTree *built = btree_build(arr, 100);
    ASSERT_TRUE(built != NULL, "btree_build devolvió NULL");
    ASSERT_EQ((int64_t)btree_size(built), 100, "size incorrecto en build");
    ASSERT_TRUE(btree_validate(built), "validate falló en build");
    btree_destroy(built);
    TEST_PASS();

cleanup:
    return;
}

int main(void)
{
    printf("=========================================================\n");
    printf("  B-Tree — Suite de Pruebas Automáticas (Análogo a T-Tree)\n");
    printf("  BTREE_NODE_MIN=%d  BTREE_NODE_MAX=%d\n", BTREE_NODE_MIN, BTREE_NODE_MAX);
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

    printf("\n=========================================================\n");
    printf("  RESUMEN B-TREE: %d/%d pruebas pasadas (%d fallidas)\n",
           tests_passed, tests_run, tests_failed);
    printf("=========================================================\n");

    return tests_failed > 0 ? 1 : 0;
}
