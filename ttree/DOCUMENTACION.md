# Documentacion Tecnica del T-Tree

## Indice

1. Que es un T-Tree
2. Estructura interna de un nodo
3. Propiedades e invariantes
4. Logica de las operaciones principales
5. Balance AVL
6. Descripcion de los archivos del proyecto
7. Orden de compilacion y ejecucion
8. Parametros configurables

---

## 1. Que es un T-Tree

El T-Tree fue propuesto por Lehman y Carey en 1986 para bases de datos en memoria principal (MMDB). Es un arbol binario de busqueda balanceado donde cada nodo no almacena una sola clave, sino un arreglo ordenado de claves.

Combina dos ideas:

- La eficiencia de busqueda de los arboles binarios balanceados (tipo AVL), que garantiza altura O(log n).
- La densidad de almacenamiento de los arboles B, donde cada nodo contiene multiples claves y se aprovecha mejor la localidad de cache.

En un BST clasico, cada nodo tiene exactamente una clave y dos punteros. En un T-Tree, cada nodo tiene entre TTREE_NODE_MIN y TTREE_NODE_MAX claves y los mismos dos punteros de hijo. Esto reduce la cantidad de nodos totales (menos punteros en memoria) y mejora el rendimiento de busqueda en sistemas donde la memoria principal es el medio de almacenamiento primario.

---

## 2. Estructura interna de un nodo

Cada nodo del T-Tree contiene los siguientes campos:

```
TTreeNode {
    keys[TTREE_NODE_MAX]  -- arreglo de claves ordenado ascendentemente
    count                 -- cuantas claves hay actualmente en el nodo
    height                -- altura del subarbol enraizado en este nodo
    left                  -- puntero al hijo izquierdo
    right                 -- puntero al hijo derecho
    parent                -- puntero al padre (para rebalanceo ascendente)
}
```

El arreglo `keys` siempre esta ordenado de menor a mayor. Las posiciones de 0 a `count-1` son validas. Las posiciones de `count` a `TTREE_NODE_MAX-1` estan sin usar.

- `keys[0]` es el minimo del nodo.
- `keys[count-1]` es el maximo del nodo.

---

## 3. Propiedades e invariantes

### Invariante BST del T-Tree

Para cualquier nodo N con subarbol izquierdo L y subarbol derecho R:

```
max(L) < keys_N[0] <= keys_N[count-1] < min(R)
```

Es decir, todas las claves del subarbol izquierdo son estrictamente menores que el minimo del nodo, y todas las claves del subarbol derecho son estrictamente mayores que el maximo del nodo.

Esta propiedad permite poda eficiente durante la busqueda: si la clave buscada es menor que el minimo del nodo, la busqueda desciende directamente al hijo izquierdo sin examinar ninguna clave del nodo.

### Invariante de balance AVL

Para cualquier nodo N:

```
| altura(left) - altura(right) | <= 1
```

El factor de balance se define como `bf = altura(left) - altura(right)`. Si bf = +2 o bf = -2 despues de una insercion, se aplica una rotacion para restaurar el balance.

### Invariante de ocupacion

Cada nodo (salvo situaciones transitorias durante la insercion) contiene entre 1 y TTREE_NODE_MAX claves. En un arbol completamente construido, los nodos internos idealmente tienen al menos TTREE_NODE_MIN claves.

---

## 4. Logica de las operaciones principales

### Busqueda exacta

La busqueda en un T-Tree sigue estos pasos en cada nodo visitado:

1. Si la clave buscada es menor que `keys[0]` (el minimo del nodo), descender al hijo izquierdo.
2. Si la clave buscada es mayor que `keys[count-1]` (el maximo del nodo), descender al hijo derecho.
3. Si la clave esta en el rango `[keys[0], keys[count-1]]`, realizar una busqueda binaria dentro del arreglo del nodo.
4. Si se llega a un puntero NULL, la clave no existe en el arbol.

La busqueda binaria dentro del arreglo tiene costo O(log b) donde b es TTREE_NODE_MAX. Como b es una constante, el costo dominante es el descenso por el arbol: O(log n).

### Insercion

La insercion es el aspecto mas complejo del T-Tree. La funcion `insert_recursive` opera de la siguiente manera en cada nodo N visitado:

**Caso A: la clave cae dentro del rango del nodo, es decir, `keys[0] <= key <= keys[count-1]`**

Este nodo es el "nodo responsable" de la clave. Hay dos subcasos:

- Si el nodo tiene espacio (`count < TTREE_NODE_MAX`): insertar la clave en el arreglo manteniendo el orden. La insercion termina aqui.
- Si el nodo esta lleno: se necesita hacer espacio. Se extrae el maximo actual del nodo (`keys[count-1]`), se inserta la nueva clave en su lugar, y el maximo extraido se reinserta recursivamente en el subarbol derecho. Esto es correcto porque el invariante BST garantiza que el maximo del nodo era estrictamente menor que el minimo del subarbol derecho, por lo que el desplazado encaja sin violar el invariante.

**Caso B: la clave es menor que el minimo del nodo**

Descender al hijo izquierdo. Cuando se llega a un puntero NULL, se crea un nuevo nodo hoja con la clave.

**Caso C: la clave es mayor que el maximo del nodo**

Descender al hijo derecho. Identico al Caso B en logica.

Al retornar de la llamada recursiva (en el camino de vuelta hacia la raiz), cada nodo aplica `rebalance` para corregir posibles desbalances causados por la insercion.

### Busqueda por rango

La funcion `range_search` recorre el arbol en orden (izquierda, nodo, derecha) con poda inteligente:

- Si el maximo del nodo es menor que el limite inferior del rango buscado, el subarbol izquierdo no tiene resultados utiles. Se omite.
- Si el minimo del nodo es mayor que el limite superior del rango, el subarbol derecho no tiene resultados. Se omite.

Dentro de cada nodo, se recorre el arreglo de claves (que esta ordenado) y se acumulan las claves dentro del rango. Cuando se encuentra una clave mayor que el limite superior, se detiene el recorrido del arreglo (porque el resto tampoco puede ser valido).

Complejidad: O(log n + m) donde m es la cantidad de resultados encontrados.

---

## 5. Balance AVL

Despues de cada insercion, al retornar de la recursion, cada nodo en el camino hacia la raiz puede quedar desbalanceado. La funcion `rebalance` detecta el caso y aplica la rotacion correspondiente.

Hay cuatro casos posibles:

**Caso LL (izquierda-izquierda):**
El subarbol izquierdo es demasiado alto y su hijo izquierdo es el mas pesado. Se aplica una rotacion simple a la derecha sobre el nodo desbalanceado.

```
Antes:       Despues:
    y            x
   /            / \
  x            A   y
 /
A
```

**Caso LR (izquierda-derecha):**
El subarbol izquierdo es demasiado alto pero su hijo derecho es el mas pesado. Se aplica primero una rotacion a la izquierda sobre el hijo izquierdo, luego una rotacion a la derecha sobre el nodo.

**Caso RR (derecha-derecha):**
Simetrico al caso LL. Se aplica una rotacion simple a la izquierda.

**Caso RL (derecha-izquierda):**
Simetrico al caso LR. Rotacion a la derecha sobre el hijo derecho, luego rotacion a la izquierda sobre el nodo.

En todos los casos, `rotate_right` y `rotate_left` actualizan los punteros de padre y las alturas correctamente antes de retornar el nuevo subraiz.

---

## 6. Descripcion de los archivos del proyecto

### src/ttree.h

Archivo de cabecera publica. Define:

- Las constantes `TTREE_NODE_MIN` y `TTREE_NODE_MAX`.
- El tipo `TTreeKey` (int64_t).
- La estructura `TTreeNode` con su arreglo de claves, altura, contadores y punteros.
- La estructura `TTree` como contenedor de la raiz y contadores globales.
- Las declaraciones de todas las funciones publicas.

Este archivo es lo unico que necesita incluir cualquier codigo que use el T-Tree desde afuera.

### src/ttree.c

Implementacion completa del T-Tree. Contiene:

- Funciones privadas (marcadas `static`): manejo del arreglo interno del nodo (`node_bsearch`, `node_insert_sorted`, `node_remove_at`), rotaciones AVL (`rotate_left`, `rotate_right`, `rebalance`), y la funcion recursiva de insercion (`insert_recursive`).
- Funciones publicas: `ttree_create`, `ttree_destroy`, `ttree_build`, `ttree_insert`, `ttree_search`, `ttree_range_search`, `ttree_print`, `ttree_validate`, `ttree_size`, `ttree_height`.

No tiene ninguna dependencia externa fuera de la biblioteca estandar de C (stdlib.h, stdio.h, string.h, inttypes.h, stdint.h).

### tests/test_ttree.c

Suite de pruebas automaticas. Contiene un marco de pruebas minimo propio (macros `TEST_BEGIN`, `TEST_PASS`, `TEST_FAIL`, `ASSERT_TRUE`, `ASSERT_EQ`) y 10 pruebas que cubren:

1. Arbol vacio
2. Insercion basica
3. Busqueda exitosa
4. Busqueda fallida
5. Duplicados
6. Inserciones en orden aleatorio
7. Busqueda por rango
8. Insercion secuencial ascendente (1 a 1000)
9. Insercion secuencial descendente (1000 a 1)
10. Gestion de memoria

Al final imprime el total de pruebas pasadas y fallidas.

### postgres/ttree_am.h

Declaraciones de las funciones que PostgreSQL necesita para registrar el T-Tree como un Index Access Method. Solo se activan cuando se compila con la macro `BUILDING_TTREE_PG`, es decir, cuando se esta compilando la extension de PostgreSQL. En compilacion normal (sin esa macro) el archivo queda vacio.

### postgres/ttree_am.c

Implementacion del adaptador entre PostgreSQL y el nucleo del T-Tree. Contiene:

- `ttree_handler`: funcion que PostgreSQL llama al encontrar `CREATE INDEX USING ttree`. Devuelve una estructura `IndexAmRoutine` con punteros a todas las funciones del metodo de acceso.
- `ttree_build_index`: construye el indice escaneando la tabla completa.
- `ttree_insert`: recibe una tupla de PostgreSQL y la inserta en el indice.
- `ttree_beginscan`, `ttree_rescan`, `ttree_gettuple`, `ttree_getbitmap`, `ttree_endscan`: gestionan el ciclo de vida de un scan del indice.
- `ttree_costestimate`: le dice al planificador de PostgreSQL el costo estimado de usar este indice.

Este archivo depende de las cabeceras de desarrollo de PostgreSQL y no puede compilarse sin ellas.

### postgres/ttree.control

Archivo de control de la extension PostgreSQL. Le indica a PostgreSQL el nombre de la extension, la version por defecto, el modulo C que implementa las funciones, y otras propiedades. Es requerido por `CREATE EXTENSION`.

### postgres/ttree--1.0.sql

Script SQL que se ejecuta cuando el usuario hace `CREATE EXTENSION ttree` en PostgreSQL. Registra:

- La funcion handler del access method.
- El access method en si (`CREATE ACCESS METHOD ttree`).
- La operator class para el tipo `int8` (bigint), que define que operadores acepta el indice.
- La tabla de prueba `ttree_test`.
- La funcion de utilidad `ttree_populate` para poblar la tabla con datos de prueba.

### build.ps1

Script de compilacion para Windows con PowerShell. Es el equivalente del Makefile para el entorno Windows. Acepta los parametros `test` (por defecto), `clean`, `debug`, y `build`.

### Makefile

Equivalente de build.ps1 para Linux, macOS, y WSL. Soporta los targets `make`, `make test`, `make debug`, `make clean`, y `make pg-extension`.

### Dockerfile

Define un entorno de contenedor basado en Debian con PostgreSQL y las herramientas de compilacion necesarias. Permite construir y probar el T-Tree en un entorno reproducible sin necesidad de instalar nada localmente excepto Docker.

### data/benchmark.sql

Script SQL para comparar el rendimiento de tres estrategias de busqueda sobre una tabla de un millon de filas: sin indice (sequential scan), con indice B-Tree (estandar de PostgreSQL), y con indice T-Tree. Se ejecuta en psql una vez instalada la extension.

---

## 7. Orden de compilacion y ejecucion

### En Windows (PowerShell)

La compilacion no tiene pasos intermedios separados. El script `build.ps1` invoca gcc directamente con todos los archivos fuente en un solo comando:

```
gcc  src/ttree.c  tests/test_ttree.c  ->  build/test_ttree.exe
```

El orden logico es:

1. `src/ttree.h` se incluye primero (tanto desde `ttree.c` como desde `test_ttree.c`).
2. `src/ttree.c` se compila: primero las funciones privadas (utilidades, rotaciones, insercion recursiva) y luego las publicas.
3. `tests/test_ttree.c` se compila: incluye `ttree.h` para conocer los tipos y declaraciones, pero llama a las funciones definidas en `ttree.c`.
4. El enlazador une los dos objetos en un unico ejecutable.
5. Al ejecutar `build/test_ttree.exe`, la funcion `main` de `test_ttree.c` llama a cada funcion de prueba en orden, y cada una llama a las funciones del T-Tree.

No hay dependencias externas mas alla de la biblioteca estandar de C.

### En Linux, macOS, o WSL

```
make       -- compila src/ttree.c como objeto
make test  -- compila src/ttree.c + tests/test_ttree.c y ejecuta el binario
make debug -- igual pero con -g3 -O0 -fsanitize=address,undefined
```

---

## 8. Parametros configurables

Los dos parametros mas importantes se definen en `src/ttree.h`:

```c
#define TTREE_NODE_MIN  4
#define TTREE_NODE_MAX  8
```

`TTREE_NODE_MAX` determina cuantas claves puede almacenar cada nodo. Un valor mas alto reduce la altura del arbol (menos nodos totales) pero aumenta el tiempo de busqueda dentro del arreglo. Un valor mas bajo produce un arbol mas parecido a un BST puro.

`TTREE_NODE_MIN` se define para documentar el umbral de underflow (cuando un nodo cae por debajo de este numero de claves podria redistribuirse con vecinos). En la implementacion actual el underflow se maneja implicitamente: los nodos pueden tener desde 1 clave.

La eleccion de `MAX=8` tiene una justificacion practica: ocho valores int64_t ocupan 64 bytes, que corresponde exactamente a una linea de cache tipica en procesadores modernos. Esto maximiza la probabilidad de que el arreglo completo de un nodo sea cargado en cache en un solo acceso a memoria.

La clave utilizada es `int64_t` (entero con signo de 64 bits), que en PostgreSQL corresponde al tipo `bigint`. Esta eleccion permite indexar identificadores numericos grandes y rangos negativos.

---

Referencia:

Lehman, T. J. & Carey, M. J. (1986). A Study of Index Structures for Main Memory Database Management Systems. Proceedings of the 12th International Conference on Very Large Databases (VLDB), pp. 294-303.
