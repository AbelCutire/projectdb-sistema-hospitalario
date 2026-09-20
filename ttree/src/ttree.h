/*
 * ttree.h — T-Tree Index Structure
 *
 * Proyecto Académico: Bases de Datos II — Indexación y Distribución en PostgreSQL
 * Estructura: T-Tree propio implementado en C
 *
 * Un T-Tree es un árbol binario de búsqueda balanceado (tipo AVL) donde cada
 * nodo contiene un ARREGLO ORDENADO de claves en lugar de una sola clave.
 * Combina las ventajas de los árboles binarios balanceados con la densidad
 * de almacenamiento de los árboles B.
 *
 * Referencia conceptual:
 *   Lehman, T. J. & Carey, M. J. (1986). "A Study of Index Structures for
 *   Main Memory Database Management Systems". VLDB 1986.
 *
 * Tipo de clave: int64_t (entero de 64 bits con signo)
 * Sin claves duplicadas (decisión de diseño — ver README.md)
 */

#ifndef TTREE_H
#define TTREE_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

/* =========================================================================
 * CONSTANTES CONFIGURABLES
 * =========================================================================
 *
 * Cada nodo puede contener entre TTREE_NODE_MIN y TTREE_NODE_MAX claves.
 *
 * - TTREE_NODE_MAX=8 produce nodos relativamente densos, reduce la altura
 *   del árbol y aprovecha la localidad de cache.
 * - TTREE_NODE_MIN=4 es el umbral de "underflow": si un nodo interno cae
 *   por debajo de este número, se intenta redistribuir desde vecinos.
 *
 * Con estas constantes el factor de ocupación mínimo es 50 %.
 */
#define TTREE_NODE_MIN  4
#define TTREE_NODE_MAX  8

/* =========================================================================
 * TIPOS BASE
 * =========================================================================
 */

/* Clave: entero de 64 bits con signo */
typedef int64_t TTreeKey;

/* Valor inválido / centinela */
#define TTREE_KEY_INVALID  INT64_MIN

/* =========================================================================
 * ESTRUCTURA DE NODO
 * =========================================================================
 *
 * Un nodo del T-Tree contiene:
 *   - Un arreglo ordenado de 'count' claves (entre 0 y TTREE_NODE_MAX)
 *   - Punteros al hijo izquierdo y derecho
 *   - Puntero al padre (necesario para rebalanceo ascendente)
 *   - Altura del subárbol (para cálculo de balance estilo AVL)
 *
 * Mínimo:  keys[0]         (el más pequeño del nodo)
 * Máximo:  keys[count-1]   (el más grande del nodo)
 *
 * Invariante:
 *   Para todo nodo N:
 *     max(subárbol_izq) < min(N)  <=  max(N) < min(subárbol_der)
 */
typedef struct TTreeNode {
    TTreeKey            keys[TTREE_NODE_MAX];  /* claves ordenadas ascendentemente */
    int                 count;                 /* número actual de claves en el nodo */
    int                 height;                /* altura del subárbol enraizado aquí  */
    struct TTreeNode   *left;                  /* hijo izquierdo */
    struct TTreeNode   *right;                 /* hijo derecho   */
    struct TTreeNode   *parent;                /* padre (NULL si es raíz)            */
} TTreeNode;

/* =========================================================================
 * ESTRUCTURA RAÍZ DEL ÁRBOL
 * =========================================================================
 */
typedef struct TTree {
    TTreeNode  *root;       /* nodo raíz (NULL = árbol vacío) */
    size_t      size;       /* número total de claves almacenadas */
    size_t      node_count; /* número de nodos */
} TTree;

/* =========================================================================
 * API PÚBLICA — CICLO DE VIDA
 * ========================================================================= */

/**
 * ttree_create — Crea un árbol vacío.
 *
 * Devuelve un puntero al TTree recién asignado, o NULL si falla malloc.
 * El llamador es responsable de liberar con ttree_destroy().
 */
TTree *ttree_create(void);

/**
 * ttree_destroy — Libera toda la memoria del árbol (nodos + estructura raíz).
 *
 * Después de esta llamada el puntero no debe usarse.
 * Si tree == NULL, no hace nada.
 */
void ttree_destroy(TTree *tree);

/* =========================================================================
 * API PÚBLICA — CONSTRUCCIÓN
 * ========================================================================= */

/**
 * ttree_build — Construye un árbol a partir de un array de claves.
 *
 * Equivalente a llamar ttree_create() + ttree_insert() para cada clave.
 * Las claves duplicadas se ignoran (ttree_insert devuelve false).
 *
 * Complejidad: O(n * log n)   donde n = número de claves
 *
 * Parámetros:
 *   keys  — array de claves de entrada
 *   n     — tamaño del array
 *
 * Devuelve el árbol construido, o NULL si falla la asignación inicial.
 */
TTree *ttree_build(const TTreeKey *keys, size_t n);

/* =========================================================================
 * API PÚBLICA — BÚSQUEDA Y MODIFICACIÓN
 * ========================================================================= */

/**
 * ttree_search — Búsqueda exacta de una clave.
 *
 * Complejidad: O(log n * log(TTREE_NODE_MAX))
 *              ≈ O(log n) en la práctica (TTREE_NODE_MAX es constante)
 *
 * Devuelve true si la clave existe, false si no.
 */
bool ttree_search(TTree *tree, TTreeKey key);

/**
 * ttree_insert — Inserta una clave en el árbol.
 *
 * Semántica de duplicados: si la clave ya existe, devuelve false y no
 * modifica el árbol (sin duplicados — ver README.md, sección 9).
 *
 * Complejidad: O(log n) amortizado (incluye posible rebalanceo)
 *
 * Devuelve:
 *   true  — clave insertada correctamente
 *   false — clave duplicada (no insertada) o error de memoria
 */
bool ttree_insert(TTree *tree, TTreeKey key);

/**
 * ttree_range_search — Búsqueda por rango [lower, upper] (ambos inclusive).
 *
 * Almacena en 'results' (capacidad max_results) todas las claves k
 * con lower <= k <= upper.
 *
 * Complejidad: O(log n + m)   donde m = número de resultados
 *
 * Devuelve el número de claves encontradas (puede ser 0).
 * Si hay más de max_results resultados, solo se devuelven los primeros
 * max_results (se garantiza que results[0..ret-1] son válidos).
 */
size_t ttree_range_search(TTree        *tree,
                          TTreeKey      lower,
                          TTreeKey      upper,
                          TTreeKey     *results,
                          size_t        max_results);

/* =========================================================================
 * API PÚBLICA — DIAGNÓSTICO Y VALIDACIÓN
 * ========================================================================= */

/**
 * ttree_print — Imprime el árbol en stdout para diagnóstico.
 *
 * Formato por nodo:
 *   [h=<altura>] min=<min> max=<max> keys=[k0, k1, ...]
 *     left  -> ...
 *     right -> ...
 */
void ttree_print(TTree *tree);

/**
 * ttree_validate — Verifica propiedades estructurales del árbol.
 *
 * Comprueba:
 *   1. Claves ordenadas dentro de cada nodo
 *   2. Mínimo/máximo coherentes
 *   3. Relación BST entre nodos (max_izq < min_nodo <= max_nodo < min_der)
 *   4. Alturas correctas
 *   5. Factor de balance AVL (|balance| <= 1) en cada nodo
 *   6. Coherencia de punteros padre
 *   7. count en rango válido
 *
 * Devuelve true si el árbol es completamente válido, false si hay error.
 * Imprime los errores detectados en stderr.
 */
bool ttree_validate(TTree *tree);

/**
 * ttree_size — Número total de claves almacenadas.
 */
size_t ttree_size(const TTree *tree);

/**
 * ttree_height — Altura del árbol (0 si vacío).
 */
int ttree_height(const TTree *tree);

#endif /* TTREE_H */
