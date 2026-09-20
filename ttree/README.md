# T-Tree — Implementación en C para PostgreSQL 18

**Proyecto Académico: Bases de Datos II — Indexación y Distribución en PostgreSQL**

---

## 1. Objetivo

Un **T-Tree** es un árbol binario de búsqueda balanceado (similar a un AVL) donde cada nodo almacena un **arreglo ordenado** de claves en lugar de una sola clave. Esta estructura combina:

- La eficiencia de búsqueda de los árboles binarios balanceados: `O(log n)`
- La densidad de almacenamiento de los árboles B (más claves por nodo)
- Menor uso de memoria de punteros que los BST puros

El objetivo académico es:
1. Implementar el T-Tree desde cero en C
2. Probarlo de forma autónoma con una suite de pruebas automáticas
3. Integrarlo como **Index Access Method (IAM)** de PostgreSQL 18

Esto permite comparar el rendimiento del T-Tree contra el B-Tree estándar de PostgreSQL en búsquedas exactas y por rango.

---

## 2. Estructura de cada nodo

```
┌────────────────────────────────────────────────────┐
│  TTreeNode                                         │
│                                                    │
│  keys[]:  [ k0 | k1 | k2 | ... | k_{MAX-1} ]     │ ← arreglo ordenado
│  count:   número actual de claves (1..MAX)         │
│  height:  altura del subárbol enraizado aquí       │
│  *left:   puntero al hijo izquierdo                │
│  *right:  puntero al hijo derecho                  │
│  *parent: puntero al padre                         │
└────────────────────────────────────────────────────┘
```

**Invariante central:**

```
max(subárbol_izq)  <  keys[0]  ≤  keys[count-1]  <  min(subárbol_der)
```

Esta propiedad permite **poda eficiente** durante la búsqueda: si la clave buscada está fuera del rango `[keys[0], keys[count-1]]`, la búsqueda desciende directamente al hijo correspondiente.

**Constantes configurables:**

```c
#define TTREE_NODE_MIN  4   // umbral de underflow
#define TTREE_NODE_MAX  8   // capacidad máxima del arreglo
```

Con `MAX=8`, cada nodo almacena hasta 8 claves. El factor de ocupación mínimo es `MIN/MAX = 50%`.

---

## 3. Operaciones

### 3.1 Creación

```c
TTree *ttree_create(void);
```

Crea un árbol vacío en `O(1)`.

### 3.2 Construcción desde array

```c
TTree *ttree_build(const TTreeKey *keys, size_t n);
```

Construye el árbol insertando `n` claves. Complejidad: `O(n log n)`.

### 3.3 Búsqueda exacta

```c
bool ttree_search(TTree *tree, TTreeKey key);
```

Desciende por el árbol usando el rango `[min, max]` de cada nodo para decidir la dirección. Una vez en el nodo apropiado, hace búsqueda binaria en el arreglo.

**Proceso:**
1. Si `key < min(nodo)` → bajar izquierda
2. Si `key > max(nodo)` → bajar derecha
3. Si `min ≤ key ≤ max` → búsqueda binaria en el arreglo

### 3.4 Inserción

```c
bool ttree_insert(TTree *tree, TTreeKey key);
```

**Proceso:**
1. Descender al nodo apropiado según el rango
2. Si el nodo tiene espacio → insertar en el arreglo manteniendo el orden
3. Si el nodo está lleno:
   - Si `key < min(nodo)`: crear/bajar al hijo izquierdo
   - Si `key > max(nodo)`: crear/bajar al hijo derecho
   - Si `key ∈ [min, max]`: desplazar el mínimo al hijo izquierdo e insertar `key` aquí
4. Rebalancear en el camino de vuelta (rotaciones AVL)

Devuelve `false` si la clave ya existe (sin duplicados).

### 3.5 Búsqueda por rango

```c
size_t ttree_range_search(TTree *tree, TTreeKey lower, TTreeKey upper,
                          TTreeKey *results, size_t max_results);
```

Recorre el árbol con poda inteligente:
- Si `max(nodo) < lower`: saltar subárbol izquierdo
- Si `min(nodo) > upper`: saltar subárbol derecho

---

## 4. Balance

El T-Tree mantiene el balance con el algoritmo **AVL** (factor de balance = diferencia de alturas entre hijo izquierdo y derecho, máximo `±1`).

Después de cada inserción se ejecuta `rebalance()` en el camino de vuelta a la raíz, aplicando las 4 rotaciones estándar:

| Caso | Condición | Solución |
|------|-----------|----------|
| LL (izq-izq) | `bal > 1`, hijo_izq equilibrado o pesado izquierda | Rotación derecha |
| LR (izq-der) | `bal > 1`, hijo_izq pesado derecha | Rot izq en hijo + rot der en nodo |
| RR (der-der) | `bal < -1`, hijo_der equilibrado o pesado derecha | Rotación izquierda |
| RL (der-izq) | `bal < -1`, hijo_der pesado izquierda | Rot der en hijo + rot izq en nodo |

Las rotaciones se implementan en `rotate_left()` y `rotate_right()` en `src/ttree.c`.

---

## 5. Complejidad

| Operación | Complejidad | Explicación |
|-----------|-------------|-------------|
| `ttree_create` | O(1) | Solo malloc |
| `ttree_search` | O(log n) | O(log(n/b)) en altura + O(log b) binario en nodo |
| `ttree_insert` | O(log n) | Descenso + rebalanceo ascendente |
| `ttree_build` | O(n log n) | n inserciones O(log n) cada una |
| `ttree_range_search` | O(log n + m) | log n para encontrar rango, m para recorrerlo |
| `ttree_destroy` | O(n) | Recorrido postorden de todos los nodos |

Donde:
- `n` = número total de claves
- `b` = `TTREE_NODE_MAX` (constante)
- `m` = número de claves en el rango de búsqueda

**La altura del árbol** es O(log(n/b)), que es mejor que un BST puro O(log n) cuando b > 1.

---

## 6. Compilación

### Requisitos
- `gcc` con soporte C11
- Linux, macOS, WSL o Docker

### Compilar

```bash
cd ttree/
make
```

### Ejecutar pruebas

```bash
make test
```

### Compilar con sanitizers (recomendado para desarrollo)

```bash
make debug
ASAN_OPTIONS=detect_leaks=1 ./build/test_ttree_debug
```

### Limpiar

```bash
make clean
```

---

## 7. Pruebas

La suite en `tests/test_ttree.c` cubre 10 casos:

| # | Caso | Descripción |
|---|------|-------------|
| 1 | Árbol vacío | create, size=0, height=0, search=false, validate |
| 2 | Inserción básica | 7 claves: {50,20,80,10,30,60,90} |
| 3 | Búsqueda exitosa | Encontrar todas las claves insertadas |
| 4 | Búsqueda fallida | Claves ausentes no se encuentran |
| 5 | Duplicados | `insert` devuelve `false` en duplicados |
| 6 | Orden aleatorio | 200 valores en orden aleatorio |
| 7 | Rango | [10,50], [1,100], [-5,0], búsqueda puntual |
| 8 | Secuencial asc | 1..1000, verificar altura O(log n) |
| 9 | Secuencial desc | 1000..1, verificar altura O(log n) |
| 10 | Memoria | 50 árboles × 500 claves, ttree_build, destroy(NULL) |

### Ejecutar

```bash
make test
# Resultado esperado:
# RESULTADO: 30/30 pruebas pasadas
```

---

## 8. Integración con PostgreSQL

### Archivos

```
ttree/postgres/
├── ttree_am.h        → declaraciones del access method
├── ttree_am.c        → implementación del IAM
├── ttree.control     → metadata de la extensión
└── ttree--1.0.sql    → registro en PostgreSQL (SQL)
```

### Arquitectura

```
PostgreSQL (CREATE INDEX USING ttree)
       │
       ▼
ttree_handler()           ← devuelve IndexAmRoutine con punteros a funciones
       │
  ┌────┴──────────────────────────┐
  │     IndexAmRoutine            │
  │  ambuild   → ttree_build_index│
  │  aminsert  → ttree_insert     │
  │  ambeginscan→ ttree_beginscan │
  │  amgettuple→ ttree_gettuple   │
  │  amendscan → ttree_endscan    │
  └────┬──────────────────────────┘
       │
       ▼
  ttree.c (núcleo independiente)
```

### Compilar la extensión

```bash
# Requiere postgresql-server-dev-18
make pg-extension

# Instalar
sudo cp build/ttree_am.so $(pg_config --pkglibdir)/
sudo cp postgres/ttree.control $(pg_config --sharedir)/extension/
sudo cp postgres/ttree--1.0.sql $(pg_config --sharedir)/extension/

# En psql:
CREATE EXTENSION ttree;
CREATE TABLE ttree_test (id BIGINT NOT NULL);
CREATE INDEX ON ttree_test USING ttree (id);
```

### Con Docker

```bash
cd ttree/
docker build -t ttree-dev .
docker run --rm ttree-dev make test
```

---

## 9. Decisiones de diseño

### Tamaño del nodo (TTREE_NODE_MIN=4, TTREE_NODE_MAX=8)

Elegimos `MAX=8` como balance entre:
- Densidad de almacenamiento (más claves por nodo → menos punteros)
- Overhead de búsqueda lineal/binaria dentro del arreglo (O(log 8) = 3 comparaciones)
- Compatibilidad con la cache L1 de CPU (~64 bytes de line cache ≈ 8 × int64)

El `MIN=MAX/2` sigue la convención de árboles B y garantiza `≥50%` de ocupación.

### Tipo de clave: int64_t

Elegido porque:
- El dataset académico usa datos numéricos enteros
- int64 permite valores negativos y rangos grandes
- Es el tipo `bigint` de PostgreSQL → integración directa sin conversión

### Manejo de duplicados: NO duplicados

`ttree_insert()` devuelve `false` y no modifica el árbol si la clave ya existe. Esta es la semántica más común en índices de bases de datos (unicidad de valores indexados). Para soportar duplicados, se necesitaría almacenar listas de TIDs por clave.

### Balance: AVL clásico

Se eligió AVL (factor de balance ±1) sobre Red-Black porque:
- Las búsquedas son más eficientes (AVL más estrictamente balanceado)
- La implementación es más intuitiva para fines académicos
- El costo extra de rebalanceo en inserción es aceptable para la fase académica

### Memoria: gestión manual con malloc/free

El núcleo del T-Tree es completamente independiente de PostgreSQL. Usa `malloc`/`free` estándar de C, lo que permite compilarlo y probarlo sin ninguna dependencia externa.

La capa de PostgreSQL (`ttree_am.c`) usa `palloc`/`pfree` del memory context de PostgreSQL cuando se compila con `BUILDING_TTREE_PG`.

---

## 10. Limitaciones (fase actual)

Las siguientes características NO están implementadas en esta primera fase y quedan documentadas para las siguientes iteraciones:

1. **Persistencia en disco**: El T-Tree existe solo en memoria RAM. Una implementación productiva requiere serializar los nodos en páginas del buffer de PostgreSQL.

2. **Almacenamiento de TIDs**: Los nodos solo almacenan claves `int64_t`. En producción, cada clave debe estar asociada a un `ItemPointer` (TID) que apunte a la tupla en la tabla heap.

3. **Eliminación**: `ttree_insert` devuelve false pero no hay `ttree_delete`. El índice no soporta UPDATE/DELETE de registros.

4. **Vacuum/Cleanup**: Sin implementación de `ambulkdelete` ni `amvacuumcleanup`.

5. **Multiclave**: Solo soporta índices de una columna de tipo `int8`.

6. **Concurrencia**: Sin locking. No es seguro para múltiples escritores simultáneos.

7. **PostgreSQL 18**: El código de `ttree_am.c` está escrito para PG17/18 pero requiere instalación real para ser compilado. En Windows, usar el Dockerfile.

---

## Referencias

- Lehman, T. J. & Carey, M. J. (1986). *"A Study of Index Structures for Main Memory Database Management Systems"*. VLDB 1986.
- PostgreSQL 18 Documentation: [Index Access Method Interface](https://www.postgresql.org/docs/18/indexam.html)
- PostgreSQL 18 Source: `src/include/access/amapi.h`
- Knuth, D. (1998). *The Art of Computer Programming, Vol. 3: Sorting and Searching*, §6.2.3
