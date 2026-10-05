/*
1. Includes y constantes
2. Helpers de nodo (altura, balance, arreglo interno)
3. Rotaciones AVL (rotate_left, rotate_right, rebalance)
4. Insercion recursiva
5. Busqueda exacta
6. Busqueda por rango
7. Impresion
8. Liberacion de memoria
9. API publica
 */

#include "ttree.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <assert.h>   // para verificar el test 5

     //   helpers del nodo

static TNode *node_new(void)
{
    TNode *n = (TNode *)calloc(1, sizeof(TNode));
    if (!n) {
        fprintf(stderr, "ERROR: sin memoria\n");
        exit(EXIT_FAILURE);
    }
    n->height = 1;   /* hoja recien creada */
    n->nkeys  = 0;
    n->left   = NULL;
    n->right  = NULL;
    return n;
}


 //node_height: altura segura  -> 0 en altura 0 
 
static int node_height(TNode *n)
{
    return n ? n->height : 0;
}


  //update_height: recalcula la altura de un nodo a partir de sus hijos
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


//                node_insert_entry
/*  insertar una nueva entrada manteniendo el orden
funciona:
mpezamos desde el final y desplazamos hacia la derecha
todos los elementos que sean mayores que e.key.
Cuando paramos, la posicion i+1 es el hueco correcto.
 */
static void node_insert_entry(TNode *n, Entry e)
{
    int i = n->nkeys - 1;
    while (i >= 0 && n->entries[i].key > e.key) {
        n->entries[i + 1] = n->entries[i];
        i--;
    }

    //nueva entrada
    n->entries[i + 1] = e;
    n->nkeys++;
}


 // node_find_binary: busqueda binaria dentro del arreglo ordenado de un nodo.
static int node_find_binary(TNode *n, int key)
{
    int lo = 0;
    int hi = n->nkeys - 1;

    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (n->entries[mid].key == key) return mid;   
        if (n->entries[mid].key <  key) lo = mid + 1; 
        else                            hi = mid - 1; 
    }
    return -1;  
}


 
 //                     ROTACIONES AVL

/*
 * rotate_right: se aplica cuando el subarbol IZQUIERDO es demasiado alto.
 * Antes:          Despues:
 *       y                x
 *      / \              / \
 *     x   C    -->     A   y
 *    / \                  / \
 *   A   B                B   C
 *
 * El nodo 'y' baja a la derecha, 'x' sube a ser la nueva raiz.
 * 'B' (el hijo derecho de x) pasa a ser el hijo izquierdo de y,
 * porque sus claves son mayores que x pero menores que y.

 */
static TNode *rotate_right(TNode *y)
{
    TNode *x = y->left;   // x sera la nueva raiz 
    TNode *B = x->right;  // el subárbol que cambia de padre 

    //rotacion
    x->right = y;
    y->left  = B;

    //nuevas alturas
    update_height(y);  
    update_height(x);  

    return x;  //nueva raiz
}

/*
 * rotate_left: se aplica cuando el subarbol DERECHO es demasiado alto.
 * Es el espejo exacto de rotate_right.
 *
 * Antes:        Despues:
 *     x                y
 *    / \              / \
 *   A   y    -->     x   C
 *      / \          / \
 *     B   C        A   B
 */
static TNode *rotate_left(TNode *x)
{
    TNode *y = x->right;  //y sera la nueva raiz
    TNode *B = y->left;   // el subarbol que cambia de padre 

    //rotacion
    y->left  = x;
    x->right = B;
    //nuevas alturas
    update_height(x);  
    update_height(y);  

    return y; //nueva raiz
}

/*
 * rebalance: despues de una insercion, verifica el factor de balance
 * del nodo y aplica la rotacion necesaria si esta fuera de [-1, 1].
 *
 * Hay 4 casos segun donde este el desbalance:
 *
 *   LL (Left-Left):   bf > +1 y el hijo izquierdo es pesado izq.
 *                     -> una sola rotacion derecha.
 *
 *   LR (Left-Right):  bf > +1 pero el hijo izquierdo es pesado der.
 *                     -> primero rotar el hijo izq a la izquierda,
 *                        luego rotar el nodo a la derecha.
 *
 *   RR (Right-Right): bf < -1 y el hijo derecho es pesado der.
 *                     -> una sola rotacion izquierda.
 *
 *   RL (Right-Left):  bf < -1 pero el hijo derecho es pesado izq.
 *                     -> primero rotar el hijo der a la derecha,
 *                        luego rotar el nodo a la izquierda.
 *
 * CASO ESPECIAL DEL T-TREE (diferencia con AVL clasico):
 * En una rotacion doble (LR o RL), el nodo que queda en el centro
 * puede terminar con muy pocas claves (menos que MIN_KEYS). En ese
 * caso, el algoritmo original de Lehman & Carey indica que se deben
 * mover entradas del nodo vecino (el que tiene mas) hacia el nodo
 * que quedo con pocas. Esta redistribucion se omite aqui para
 * mantener la implementacion simple, pero se documenta el concepto.
 *
 * Devuelve la nueva raiz del subarbol (puede ser distinta del nodo recibido).
 */
static TNode *rebalance(TNode *n)
{
    if (!n) return NULL;

    update_height(n);
    int bf = balance_factor(n);

    // Caso LL
    if (bf > 1 && balance_factor(n->left) >= 0)
        return rotate_right(n);

    // Caso LR
    if (bf > 1 && balance_factor(n->left) < 0) {
        n->left = rotate_left(n->left);   
        return rotate_right(n);           
    }

    // Caso RR
    if (bf < -1 && balance_factor(n->right) <= 0)
        return rotate_left(n);

    //Caso RL
    if (bf < -1 && balance_factor(n->right) > 0) {
        n->right = rotate_right(n->right);  
        return rotate_left(n);              
    }
    return n;
}

/* ============================================================
 * SECCION 3: INSERCION RECURSIVA
 *
 * La insercion en un T-Tree sigue este razonamiento:
 *
 * Para cada nodo N con claves en el rango [kmin, kmax]:
 *
 *   A) key esta en [kmin, kmax]  ->  N es el "bounding node"
 *      a.1) Si hay espacio: insertar ordenado en el arreglo.
 *      a.2) Si esta lleno: sacar el maximo de N, insertar key,
 *           y mandar el maximo al subarbol derecho.
 *           Esto es valido porque: el maximo de N era < min(N.right),
 *           por el invariante BST. Al mandarlo a la derecha, sigue
 *           siendo menor que todo lo que ya estaba ahi.
 *
 *   B) key < kmin  ->  descender al subarbol izquierdo.
 *
 *   C) key > kmax  ->  descender al subarbol derecho.
 *
 *   D) Subarbol vacio (NULL)  ->  crear un nodo hoja nuevo.
 *
 * Al RETORNAR de la recursion (camino de vuelta hacia la raiz),
 * se llama a rebalance() en cada nodo para corregir desbalances.
 *
 * El parametro *ok indica si la insercion tuvo exito.
 * La funcion devuelve la nueva raiz del subarbol (puede cambiar
 * si hubo una rotacion).
 * ============================================================ */
static TNode *insert_node(TNode *node, Entry e, bool *ok)
{
    // caso d
    if (!node) {
        TNode *n   = node_new();
        n->entries[0] = e;
        n->nkeys      = 1;
        *ok = true;
        return n;
    }

    int kmin = node_min(node);
    int kmax = node_max(node);

    //caso a
    if (e.key >= kmin && e.key <= kmax) {

        //verificamos que no exista
        if (node_find_binary(node, e.key) >= 0) {
            fprintf(stderr, "Clave %d ya existe, se rechaza.\n", e.key);
            *ok = false;
            return node;
        }

        if (node->nkeys < MAX_KEYS) {
            // Caso a.1: hay espacio, insertar directamente 
            node_insert_entry(node, e);
            *ok = true;
        } else {
            //Caso a.2: nodo lleno.
            Entry displaced = node->entries[node->nkeys - 1]; //el maximo
            node->nkeys--;                   //quitamos el maximo 
            node_insert_entry(node, e);      //insertamos la nueva
            *ok = true;
            bool sub_ok;
            node->right = insert_node(node->right, displaced, &sub_ok);
        }
        return rebalance(node);
    }

    //Caso B: key es menor que el minimo del nodo.

    if (e.key < kmin) {
        node->left = insert_node(node->left, e, ok);
        return rebalance(node);
    }

    //Caso C: key es mayor que el maximo del nodo.
    node->right = insert_node(node->right, e, ok);
    return rebalance(node);
}

//            busqueda exacta  de manera iterativa

bool ttree_search(TTree *t, int key, int *out_rowid)
{
    TNode *cur = t->root;

    while (cur) {
        int kmin = node_min(cur);
        int kmax = node_max(cur);

        if (key < kmin) {
            cur = cur->left;

        } else if (key > kmax) {
            cur = cur->right;

        } else {
            int idx = node_find_binary(cur, key);
            if (idx >= 0) {
                if (out_rowid) *out_rowid = cur->entries[idx].rowid;
                return true;
            }
            // no existe
            return false;
        }
    }

    return false; //termina sin encontrar
}


//              busqueda por rango


static void range_node(TNode *n, int lo, int hi)
{
    if (!n) return;

    int kmin = node_min(n);
    int kmax = node_max(n);

    // Poda: si el maximo del nodo es menor que 'lo',
    if (kmax < lo) {
        range_node(n->right, lo, hi);
        return;
    }
    // Poda: si el minimo del nodo es mayor que 'hi',
    if (kmin > hi) {
        range_node(n->left, lo, hi);
        return;
    }

   
    range_node(n->left, lo, hi);

    for (int i = 0; i < n->nkeys; i++) {
        int k = n->entries[i].key;
        if (k >= lo && k <= hi)
            printf("  (key=%d, rowid=%d)\n", k, n->entries[i].rowid);
    }

    range_node(n->right, lo, hi);
}

void ttree_range_search(TTree *t, int lo, int hi)
{
    printf("Rango [%d, %d]:\n", lo, hi);
    range_node(t->root, lo, hi);
}

//                            print inorden

static void print_inorder(TNode *n)
{
    if (!n) return;
    print_inorder(n->left);
    printf("[");
    for (int i = 0; i < n->nkeys; i++) {
        printf("%d", n->entries[i].key);
        if (i < n->nkeys - 1) printf(",");
    }
    printf("] ");
    print_inorder(n->right);
}



//     trata de imprimir el arbol con su estructura, falta mejorar


static void print_structure(TNode *n, int level)
{
    if (!n) return;

    print_structure(n->right, level + 1);

    printf("%*s(h=%d, bf=%+d) [", level * 8, "", n->height, balance_factor(n));
    for (int i = 0; i < n->nkeys; i++) {
        printf("%d", n->entries[i].key);
        if (i < n->nkeys - 1) printf(",");
    }
    printf("] (%d/%d claves)\n", n->nkeys, MAX_KEYS);
    print_structure(n->left, level + 1);
}

void ttree_print(TTree *t)
{
    printf("--- Inorden: ");
    print_inorder(t->root);
    printf("\n--- Estructura (der=arriba, izq=abajo):\n");
    print_structure(t->root, 0);
    printf("--- Total claves: %d\n", t->total);
}


//              liberacion de memoria  con postorden   fija AED dx

static void destroy_node(TNode *n)
{
    if (!n) return;
    destroy_node(n->left);   
    destroy_node(n->right);  
    free(n);                 
}

void ttree_destroy(TTree *t)
{
    destroy_node(t->root);
    t->root  = NULL;
    t->total = 0;
}

//                         api publica

TTree ttree_init(void)
{
    TTree t;
    t.root  = NULL;
    t.total = 0;
    return t;
}
void ttree_build(TTree *t, Entry *arr, int n)
{
    for (int i = 0; i < n; i++)
        ttree_insert(t, arr[i].key, arr[i].rowid);
}
bool ttree_insert(TTree *t, int key, int rowid)
{
    bool ok = false;
    Entry e;
    e.key   = key;
    e.rowid = rowid;
    t->root = insert_node(t->root, e, &ok);
    if (ok) t->total++;
    return ok;
}


//                      Test 5

static int verify_node(TNode *n, int last_key, bool *es_valido)
{
    if (!n) return last_key;

    last_key = verify_node(n->left, last_key, es_valido);

    for (int i = 0; i < n->nkeys; i++) {
        if (n->entries[i].key <= last_key) *es_valido = false;
        if (i > 0 && n->entries[i].key <= n->entries[i - 1].key) *es_valido = false;
        last_key = n->entries[i].key;
    }

    int bf = balance_factor(n);
    if (bf < -1 || bf > 1) *es_valido = false;
    return verify_node(n->right, last_key, es_valido);
}


bool ttree_verify(TTree *t)
{
    if (!t) return true;
    bool es_valido = true;
    verify_node(t->root, -1, &es_valido);
    
    return es_valido;
}
