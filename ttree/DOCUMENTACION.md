## Archivos del Proyecto

1. **`ttree.h`**: Define las estructuras base (`Entry`, `TNode`, `TTree`) y la API pública.
2. **`ttree.c`**: Implementa toda la lógica del árbol (inserción, rotaciones AVL, búsquedas y liberación).
3. **`main.c`**: Contiene 5 pruebas automáticas que validan la funcionalidad del árbol usando `assert()`.
4. **`build.ps1`**: Script generado por IA (Gemini) para compilar y ejecutar todo rápidamente en Windows sin necesidad de Docker.

## Funciones Internas .c

- `node_new()`: Crea una nueva hoja vacía y maneja la asignación de memoria.
- `node_height()`, `update_height()`: Mantienen actualizada la altura de cada nodo (necesario para el balanceo AVL).
- `balance_factor()`: Calcula la diferencia de alturas (izq - der) para decidir si hay que rotar.
- `node_min()`, `node_max()`: Devuelven la clave más pequeña y más grande dentro de un nodo específico.
- `node_insert_entry()`: Inserta una nueva clave de forma ordenada dentro del arreglo de un nodo (desplazando los demás).
- `node_find_binary()`: Realiza una búsqueda binaria O(log MAX_KEYS) dentro del arreglo de un nodo.
- `rotate_left()`, `rotate_right()`: Realizan las rotaciones simples para mantener el árbol balanceado.
- `rebalance()`: Detecta los casos LL, LR, RR y RL y aplica las rotaciones correspondientes devolviendo la nueva raíz.
- `insert_node()`: Función recursiva principal. Decide si la clave baja por la izquierda, derecha, o si debe "dividir/desplazar" el nodo actual.
- `range_node()`: Recorre el árbol podando ramas que están fuera de los límites superior o inferior de la búsqueda.


## Funciones Públicas

- `ttree_init()`: Inicializa el contenedor del árbol.
- `ttree_build()`: Permite construir el árbol de forma masiva a partir de un arreglo de pares `(key, rowid)`.
- `ttree_insert()`: Inserta una clave nueva (rechazando duplicados).
- `ttree_search()`: Búsqueda exacta de una clave, devuelve el `rowid` asociado simulando encontrar el registro.
- `ttree_range_search()`: Búsqueda de todas las claves que están dentro de un rango determinado.
- `ttree_print()`: Imprime el árbol de dos formas: en orden (como lista plana) y de forma estructurada (para ver los niveles y balances).
- `ttree_destroy()`: Libera toda la memoria usando un recorrido postorden.

## pruebas main.c

- **Test 1**: Inserción secuencial ,peor caso sin avl,f uerza al árbol a aplicar rotaciones AVL constantemente.
- **Test 2**: Inserción aleatoria.
- **Test 3**: Búsqueda exacta de claves
- **Test 4**: Búsqueda por rango.
- **Test 5 (assert())**: Recorre el árbol completo asegurando mediante aserciones matemáticas que el orden de las claves es estricto y el balance AVL se respetó en cada nodo.
