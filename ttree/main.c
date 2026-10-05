
#include "ttree.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <assert.h>


//                     PRUEBAS
int main(void)
{
    printf("========================================\n");
    printf("  T-Tree  (MAX_KEYS=%d, MIN_KEYS=%d)\n", MAX_KEYS, MIN_KEYS);
    printf("========================================\n\n");

    /*
     Test 1: Insercion secuencial 1 al 20, el peor caso sin AVL
    */
    printf("Test 1: Insercion secuencial 1..20\n");
    {
        TTree t = ttree_init();
        for (int i = 1; i <= 20; i++)
            ttree_insert(&t, i, i * 100);
        ttree_print(&t);
        ttree_destroy(&t);
    }
    printf("Test 1: OK\n\n");

    /* 
    Test 2: Insercion aleatoria con semilla fija
    srand(42) hara que el resultado sea siempre igual
    aunque los numeros parezcan aleatorios.
    */
    printf("Test 2: Insercion aleatoria (srand(42), 15 elementos)\n");
    {
        TTree t = ttree_init();
        srand(42);
        for (int i = 0; i < 15; i++) {
            int k = rand() % 100;
            ttree_insert(&t, k, k);
        }
        ttree_print(&t);
        ttree_destroy(&t);
    }
    printf("Test 2: OK\n\n");

    
     // Test 3: Busqueda de clave existente e inexistente
  
    printf("Test 3: Busqueda\n");
    {
        TTree t = ttree_init();
        int claves[] = {15, 3, 7, 12, 20, 1, 9};
        int n = (int)(sizeof(claves) / sizeof(claves[0]));
        for (int i = 0; i < n; i++)
            ttree_insert(&t, claves[i], claves[i] * 10);

        int rowid = -1;
        bool encontrado;

        encontrado = ttree_search(&t, 7, &rowid);
        printf("  Buscar 7:  %s (rowid=%d)\n",
               encontrado ? "encontrado" : "no encontrado", rowid);
        assert(encontrado == true && rowid == 70);

        encontrado = ttree_search(&t, 99, &rowid);
        printf("  Buscar 99: %s\n",
               encontrado ? "encontrado" : "no encontrado");
        assert(encontrado == false);

        ttree_destroy(&t);
    }
    printf("Test 3: OK\n\n");

    
     //     Test 4: Busqueda por rango [10, 25]

    printf("Test 4: Rango [10, 25]\n");
    {
        TTree t = ttree_init();
        for (int i = 1; i <= 30; i++)
            ttree_insert(&t, i, i);
        ttree_range_search(&t, 10, 25);
        ttree_destroy(&t);
    }
    printf("Test 4: OK\n\n");

    /* 
    Test 5: Verificacion assert, si alguna condicion falla se cortara 
    */
    printf("Test 5: Verificacion automatica (inorden + balance AVL)\n");
    {
        TTree t = ttree_init();
        srand(123);
        for (int i = 0; i < 50; i++)
            ttree_insert(&t, rand() % 500, i);

        assert(ttree_verify(&t));

        ttree_destroy(&t);
    }
    printf("Test 5: OK (inorden correcto, balance AVL verificado)\n\n");

    printf("========================================\n");
    printf("  Todas las pruebas pasaron\n");
    printf("========================================\n");

    return 0;
}
