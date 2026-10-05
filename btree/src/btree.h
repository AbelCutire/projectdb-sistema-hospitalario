/*
 * btree.h — B-Tree Index Structure (Analogue to T-Tree)
 *
 * Proyecto Académico: Bases de Datos II — Indexación y Distribución
 * Estructura: B-Tree clásico implementado en C para comparación de eficiencia con T-Tree.
 *
 * Tipo de clave: int64_t (entero de 64 bits con signo)
 * Sin claves duplicadas (mismo diseño que T-Tree)
 */

#ifndef BTREE_H
#define BTREE_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

/* =========================================================================
 * CONSTANTES CONFIGURABLES
 * =========================================================================
 *
 * Grado del B-Tree:
 * - BTREE_NODE_MAX = 7  (máximo número de claves por nodo, orden M = 8 hijos)
 * - BTREE_NODE_MIN = 3  (mínimo número de claves por nodo, ceil(M/2) - 1)
 *
 * Esto es análogo a TTREE_NODE_MAX=8 del T-Tree para comparar densidades.
 */
#define BTREE_NODE_MAX  7
#define BTREE_NODE_MIN  3

/* =========================================================================
 * TIPOS BASE
 * =========================================================================
 */

/* Clave: entero de 64 bits con signo */
typedef int64_t BTreeKey;

/* Valor inválido / centinela */
#define BTREE_KEY_INVALID  INT64_MIN

/* =========================================================================
 * ESTRUCTURA DE NODO B-TREE
 * =========================================================================
 *
 * Un nodo del B-Tree contiene:
 *   - 'count': número actual de claves (1..BTREE_NODE_MAX, excepto raíz que puede tener menos)
 *   - 'keys': arreglo ordenado de claves [k0, k1, ..., k_{count-1}]
 *   - 'children': arreglo de punteros a hijos [c0, c1, ..., c_{count}] (si is_leaf es false)
 *   - 'is_leaf': booleano que indica si es nodo hoja
 */
typedef struct BTreeNode {
    int               count;                     /* número actual de claves */
    BTreeKey          keys[BTREE_NODE_MAX];      /* claves ordenadas ascendentemente */
    struct BTreeNode *children[BTREE_NODE_MAX + 1]; /* punteros a subárboles hijos */
    bool              is_leaf;                   /* true si es nodo hoja */
} BTreeNode;

/* =========================================================================
 * ESTRUCTURA RAÍZ DEL ÁRBOL
 * =========================================================================
 */
typedef struct BTree {
    BTreeNode  *root;       /* nodo raíz (NULL = árbol vacío) */
    size_t      size;       /* número total de claves almacenadas */
    size_t      node_count; /* número de nodos */
} BTree;

/* =========================================================================
 * API PÚBLICA — CICLO DE VIDA
 * ========================================================================= */

/**
 * btree_create — Crea un árbol B vacío.
 */
BTree *btree_create(void);

/**
 * btree_destroy — Libera toda la memoria del árbol.
 */
void btree_destroy(BTree *tree);

/* =========================================================================
 * API PÚBLICA — CONSTRUCCIÓN
 * ========================================================================= */

/**
 * btree_build — Construye un B-Tree a partir de un array de claves.
 */
BTree *btree_build(const BTreeKey *keys, size_t n);

/* =========================================================================
 * API PÚBLICA — BÚSQUEDA Y MODIFICACIÓN
 * ========================================================================= */

/**
 * btree_search — Búsqueda exacta de una clave.
 * Devuelve true si la clave existe, false si no.
 */
bool btree_search(BTree *tree, BTreeKey key);

/**
 * btree_insert — Inserta una clave en el B-Tree.
 * Duplicados devuelven false (sin duplicados).
 */
bool btree_insert(BTree *tree, BTreeKey key);

/**
 * btree_range_search — Búsqueda por rango [lower, upper].
 * Devuelve el número de claves encontradas.
 */
size_t btree_range_search(BTree     *tree,
                          BTreeKey   lower,
                          BTreeKey   upper,
                          BTreeKey  *results,
                          size_t     max_results);

/* =========================================================================
 * API PÚBLICA — DIAGNÓSTICO Y VALIDACIÓN
 * ========================================================================= */

/**
 * btree_print — Imprime el árbol en stdout para diagnóstico.
 */
void btree_print(BTree *tree);

/**
 * btree_validate — Verifica propiedades estructurales del B-Tree.
 */
bool btree_validate(BTree *tree);

/**
 * btree_size — Número total de claves almacenadas.
 */
size_t btree_size(const BTree *tree);

/**
 * btree_height — Altura del árbol (0 si vacío).
 */
int btree_height(const BTree *tree);

#endif /* BTREE_H */
