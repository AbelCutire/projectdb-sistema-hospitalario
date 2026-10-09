/*
  Un T-Tree es un arbol binario de busqueda balanceado (AVL) donde
 cada nodo guarda un ARREGLO ORDENADO de pares (key, rowid) en vez
 de una sola clave.  Esto reduce la cantidad de punteros en memoria
 y aprovecha mejor la cache cuando los datos viven en RAM.
 */


 //definimos TTREE_H si aun no esta definido y evitamos inclusiones multiples 
#ifndef TTREE_H
#define TTREE_H
#include <stdbool.h>  //-> para poder usar los booleanos


//                        ESTRUCTURA

#define MAX_KEYS 4
#define MIN_KEYS 2

typedef struct {
    int key;
    int rowid;
} Entry;

typedef struct TNode {
    Entry        entries[MAX_KEYS];
    int          nkeys;
    int          height;
    struct TNode *left;
    struct TNode *right;
} TNode;

typedef struct {
    TNode *root;
    int    total;  //contador de claves insertadas
} TTree;

//                                 api publica


//crear arbol
TTree ttree_init(void); 

//Construye el árbol usando n elementos de un arreglo
void  ttree_build(TTree *t, Entry *arr, int n);  

// Inserta una entrada key, rowid.
bool  ttree_insert(TTree *t, int key, int rowid);

// Buscar 'key'
bool  ttree_search(TTree *t, int key, int *out_rowid);

//Buscar todas las claves dentro de un rango
void  ttree_range_search(TTree *t, int lo, int hi);

/* Imprime el arbol inorden..-> proximamente las demas */
void  ttree_print(TTree *t);

//liberar memoria
void  ttree_destroy(TTree *t);

// Verificar integridad (Test 5)
bool  ttree_verify(TTree *t);

#endif