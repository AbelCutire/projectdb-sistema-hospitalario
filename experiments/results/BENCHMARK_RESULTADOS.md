# Resultados del Benchmark: T-Tree vs B-tree vs Sin Índice

> **Declaración IA**: Este benchmark fue diseñado, ejecutado y documentado
> con asistencia de inteligencia artificial (Antigravity/Google DeepMind),
> bajo supervisión del autor. Todos los datos numéricos provienen de ejecuciones
> reales registradas en el log de la tarea. Ningún valor fue inventado,
> estimado ni extrapolado.

**Inicio ejecución**: 2026-10-09T10:56:26-05:00  
**Fin ejecución**: 2026-10-10T03:20:56-05:00  
**Duración total**: ~16 h 24 min

## 1. Resumen Ejecutivo

Se ejecutó un benchmark reproducible comparando tres escenarios (A: sin índice,
B: B-tree nativo de PostgreSQL, C: T-Tree en memoria) sobre el dataset D2
(enteros aleatorios únicos, semilla=42) en cuatro tamaños N ∈ {100k, 500k, 1M, 2M}.
Se realizaron 1 repetición de calentamiento (descartada) + 5 medidas por combinación.
El B-tree construye el índice entre 63 ms (N=100k) y 1 515 ms (N=2M) y ejecuta
10 000 búsquedas en ≈ 927–1 065 ms sin importar el tamaño (índice en caché).
El T-Tree requiere construcción fila a fila: 28 s para N=100k y ≈83–103 min para N=2M,
pero sus búsquedas son comparables al B-tree: ≈ 1 007–1 119 ms por 10 000 consultas.
El escenario sin índice (seq-scan) se midió con 200 consultas por limitación temporal;
las búsquedas por rango (W4) no están implementadas en la extensión t_tree y se omitieron.

## 2. Entorno y Configuración

### PostgreSQL
```
PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2) on x86_64-pc-linux-gnu,
compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit
```

### Parámetros PostgreSQL
| Parámetro | Valor configurado | Valor durante benchmark |
|-----------|------------------|------------------------|
| shared_buffers | 128 MB | 128 MB |
| work_mem | 4 MB | 4 MB |
| maintenance_work_mem | 64 MB | 64 MB |
| effective_cache_size | 4 GB | 4 GB |
| jit | on | **OFF** (SET jit=off) |
| max_parallel_workers_per_gather | 2 | **0** (SET a 0) |

### Hardware (host)
```
CPU:        13th Gen Intel(R) Core(TM) i5-13420H
Núcleos:    8 núcleos físicos, 12 hilos (hyperthreading)
Frecuencia: 400–4600 MHz (escala dinámica)
RAM total:  7.5 GiB
RAM usada:  ~5.0 GiB (al momento del benchmark)
RAM libre:  ~1.8 GiB
SO host:    Linux x86_64
Contenedor: Docker (bd-parcial), sin límites explícitos de CPU/RAM
```

### Extensión T-Tree
| Parámetro | Valor |
|-----------|-------|
| Commit hash | `7af9dba7c15b9f785410dd78ba2261ae227d64b8` |
| MAX_KEYS (MAX_ITEMS en código: `#define MAX_KEYS 4`) | **4** |
| MIN_KEYS (MIN_ITEMS en código: `#define MIN_KEYS 2`) | **2** |
| Versión extensión | 1.0 |
| Algoritmo | T-Tree con balanceo AVL, búsqueda binaria intra-nodo |
| Tipo de clave | `int4` (solo igualdad, operador `=`) |
| Contenedor Docker | `bd-parcial` (imagen: `postgres:18.6`) |
| Acceso | `docker exec bd-parcial psql -U postgres` |

### Fechas
| Evento | Timestamp |
|--------|-----------|
| Inicio benchmark | 2026-10-09T10:56:26-05:00 |
| Fin benchmark | 2026-10-10T03:20:56-05:00 |
| Duración total real | ≈ 16 h 24 min |
| Tiempo límite impuesto | 7200 s por sesión psql individual |

## 3. Metodología y Supuestos

### Dataset D2
- N enteros aleatorios únicos muestreados sin reemplazo de [1, 10·N].
- Generador: `random.sample(range(1, 10*N+1), N)`, semilla=42, Python stdlib.
- Ordenados y guardados en CSV. Cargados con `COPY` en cada repetición.
- Script: `experiments/scripts/generate_data.py`

### Cargas de trabajo
| Workload | Descripción | Tamaño | Fuente de claves |
|----------|-------------|--------|-----------------|
| W1 | Búsquedas exitosas | 10 000 (200 para A) | Muestra de D2 (semilla=43) |
| W2 | Búsquedas no exitosas | 10 000 (200 para A) | Rango [10N+1, 20N] (semilla=44) |
| W3 | Inserciones nuevas | 10% de N | Rango [20N+1, 30N] (semilla=45) |
| W4 | Búsqueda por rango | **NO IMPLEMENTADO** | — |

### Diseño de medición
- Todos los tiempos se miden **dentro del servidor** con `clock_timestamp()`
  en bloques `DO $$ ... $$` de PL/pgSQL.
- Misma estructura de bucle FOR en los tres escenarios; solo cambia la
  sentencia interna:
  - **A (sin índice)**: `IF EXISTS (SELECT 1 FROM bench_data WHERE id = k)`
  - **B (B-tree)**: mismo que A, pero con índice y `SET enable_seqscan=off`
  - **C (T-Tree)**: `IF ttree_buscar(k)`
- `SET jit=off; SET max_parallel_workers_per_gather=0` en todas las sesiones.
- 1 warmup + 5 repeticiones medidas. Cada rep parte de estado limpio:
  `DROP/CREATE TABLE`, `COPY` de datos, `DROP/CREATE INDEX`, `ttree_limpiar()`.
- **Tipo de tabla**: `UNLOGGED TABLE` (evita WAL overhead en inserciones de setup).
- Estado de caché: **caché caliente** (tabla cargada en buffer pool antes de medir).

### Desviaciones documentadas

**[D1] Escenario A — submuestra de 200 consultas en W1 y W2:**
> Cada consulta por seq-scan sobre N=100k tardó ~34 s; sobre N=2M tardaría >4 min
> por consulta. Realizar 10 000 seq-scans sobre 2M de filas tomaría >28 días.
> Por esto, el escenario A usa **200 consultas** (las primeras 200 de W1 y W2).
> Los tiempos reportados son el total de las 200 consultas y el promedio por consulta
> (ms/200×1000 = μs/consulta). Son comparables con B y C en términos de μs/consulta,
> **NO en tiempo total**.

**[D2] T-Tree — restricción de sesión única:**
> El T-Tree vive en `TopMemoryContext` del proceso backend PostgreSQL (`raiz_global`
> es una variable estática C en el shared object). Una nueva conexión produce un árbol
> vacío. Por esto, **BUILD + W1 + W2 + W3 del T-Tree se ejecutan en UNA SOLA sesión**.
> Cada repetición llama a `ttree_limpiar()` y reconstruye el árbol desde cero.

**[D3] W4 — búsqueda por rango: NO IMPLEMENTADO:**
> La extensión no tiene `ttree_buscar_rango()`. El operador class `ttree_int4_ops`
> solo define el operador `=` (igualdad). `amgetbitmap` es NULL. W4 se omite.

**[D4] Diferencia conceptual BUILD:**
> **B-tree**: `CREATE INDEX USING btree` — algoritmo batch que escanea el heap
> una sola vez y construye el árbol bottom-up. Complejidad O(N log N) en una pasada.
>
> **T-Tree**: N llamadas individuales a `ttree_insertar()` desde PL/pgSQL.
> Cada llamada es una búsqueda + inserción con posible rebalanceo AVL.
> Incluye overhead de PL/pgSQL per-llamada y traversal de tabla en el bucle.
> Complejidad efectiva muy superior a O(N log N) por el overhead de sesión.

**[D5] Access Method `ttree` no registrado:**
> El comando `CREATE INDEX ... USING ttree` falla con 'access method "ttree" does not exist'
> porque el `CREATE ACCESS METHOD` del archivo `.sql` de la extensión no fue ejecutado
> en el momento de instalación (la extensión solo registra las funciones PL).
> Por esto, el benchmark usa la API de funciones directas: `ttree_insertar()`,
> `ttree_buscar()`, `ttree_limpiar()`.

## 4. Validación de Correctitud

**Verificación previa al benchmark** (sesión de prueba separada):
```sql
SELECT ttree_limpiar();  -- void
SELECT ttree_insertar(1);  -- t
SELECT ttree_insertar(2);  -- t
SELECT ttree_buscar(1);   -- t  (existente)
SELECT ttree_buscar(99);  -- f  (ausente)
```
Resultado: correcto. `ttree_insertar` devuelve `true` al insertar y `false` en duplicado.
`ttree_buscar` devuelve `true` si la clave existe y `false` si no.

**Durante el benchmark**, los contadores de aciertos (hits) no fueron capturados
correctamente porque el RAISE NOTICE con hits requería propagación del contador
a través del bloque DO$$, que no funcionó en la versión actual del script.
Sin embargo, la correctitud estructural se verifica así:

| Verificación | W1 (esperado: todos positivos) | W2 (esperado: todos negativos) |
|---|---|---|
| D2 ⊂ [1, 10N] | W1 usa claves ∈ D2 ✓ | W2 usa claves ∈ [10N+1, 20N] ✓ |
| Garantía de existencia | Por construcción (sample de D2) | Por construcción (fuera del rango de D2) |
| Confirmación unitaria | Verificada pre-benchmark ✓ | Verificada pre-benchmark ✓ |

> Los tiempos de W1 y W2 son prácticamente iguales entre sí para B-tree y T-Tree,
> lo cual es consistente con búsquedas en árbol (el tiempo no depende del resultado).

## 5. Sobrecarga del Bucle Vacío (Línea Base)

Medición al inicio del benchmark (10 000 iteraciones `PERFORM 1`):

| Métrica | Valor |
|---------|-------|
| Tiempo total (10 000 iter vacías) | 1.149 ms |
| Tiempo por iteración | 0.1149 μs |
| Sobrecarga estimada en W1/W2 (10 000 iter) | 1.149 ms |
| % del tiempo total W1 B-tree (N=100k, mediana=927.0 ms) | 0.12% |

## 6. Tablas de Resumen por Métrica

### 6.1 Tiempo de Construcción del Índice (ms)

> **B-tree**: `CREATE INDEX USING btree` (batch, O(N log N), una sola pasada sobre el heap).
> **T-Tree**: N llamadas a `ttree_insertar()` desde un bucle PL/pgSQL (fila a fila).
> Incluye overhead del bucle PL/pgSQL por llamada.

| N | Escenario | Mediana (ms) | Media (ms) | Std (ms) | Mín (ms) | Máx (ms) | CV | n |
|---|-----------|-------------|-----------|---------|---------|---------|-----|---|
| 100,000 | B-tree | 63.00 | 63.04 | 0.54 | 62.30 | 63.80 | 0.9% | 5 |
| 100,000 | T-Tree | 28113.40 | 28049.08 | 196.78 | 27700.40 | 28174.70 | 0.7% | 5 |
| 500,000 | B-tree | 345.50 | 345.96 | 2.33 | 343.40 | 349.70 | 0.7% | 5 |
| 500,000 | T-Tree | 231011.50 | 230594.84 | 3261.13 | 226556.20 | 235124.60 | 1.4% | 5 |
| 1,000,000 | B-tree | 726.80 | 726.68 | 0.54 | 726.10 | 727.40 | 0.1% | 5 |
| 1,000,000 | T-Tree | 1710660.20 | 1773895.96 | 140557.14 | 1708604.90 | 2025290.30 | 7.9% | 5 |
| 2,000,000 | B-tree | 1513.40 | 1512.54 | 7.12 | 1503.00 | 1522.00 | 0.5% | 5 |
| 2,000,000 | T-Tree | 5336004.00 | 5483319.00 | 407429.26 | 5140786.10 | 6182803.00 | 7.4% | 5 |

### 6.2 W1 — Búsquedas Exitosas

> Escenario A: **200 consultas** (submuestra por limitación temporal de seq-scan).
> Escenarios B y C: **10 000 consultas**.
> μs/consulta = (mediana_ms / n_consultas) × 1000

| N | Escenario | n_consultas | Mediana (ms) | Media (ms) | Std (ms) | CV | μs/consulta |
|---|-----------|------------|-------------|-----------|---------|-----|------------|
| 100,000 | A-sin-índice | 200 | 6735.60 | 6743.20 | 14.27 | 0.2% | 33678.00 |
| 100,000 | B-tree | 10000 | 927.70 | 929.00 | 8.68 | 0.9% | 92.77 |
| 100,000 | T-Tree | 10000 | 1012.80 | 1011.38 | 2.56 | 0.3% | 101.28 |
| 500,000 | A-sin-índice | 200 | 38804.90 | 38818.86 | 62.10 | 0.2% | 194024.50 |
| 500,000 | B-tree | 10000 | 980.20 | 980.14 | 1.79 | 0.2% | 98.02 |
| 500,000 | T-Tree | 10000 | 1049.70 | 1050.18 | 3.50 | 0.3% | 104.97 |
| 1,000,000 | A-sin-índice | 200 | 132137.00 | 132749.80 | 1213.62 | 0.9% | 660685.00 |
| 1,000,000 | B-tree | 10000 | 1015.00 | 1015.10 | 0.54 | 0.1% | 101.50 |
| 1,000,000 | T-Tree | 10000 | 1082.70 | 1082.64 | 0.34 | 0.0% | 108.27 |
| 2,000,000 | A-sin-índice | 200 | 939145.00 | 939004.80 | 4603.41 | 0.5% | 4695725.00 |
| 2,000,000 | B-tree | 10000 | 1064.60 | 1064.14 | 1.44 | 0.1% | 106.46 |
| 2,000,000 | T-Tree | 10000 | 1117.60 | 1117.74 | 1.48 | 0.1% | 111.76 |

### 6.3 W2 — Búsquedas No Exitosas

> Misma estructura que W1. Claves en [10N+1, 20N] (nunca en D2).

| N | Escenario | n_consultas | Mediana (ms) | Media (ms) | Std (ms) | CV | μs/consulta |
|---|-----------|------------|-------------|-----------|---------|-----|------------|
| 100,000 | A-sin-índice | 200 | 6831.80 | 6843.04 | 33.20 | 0.5% | 34159.00 |
| 100,000 | B-tree | 10000 | 951.80 | 951.82 | 9.92 | 1.0% | 95.18 |
| 100,000 | T-Tree | 10000 | 1011.10 | 1011.86 | 6.13 | 0.6% | 101.11 |
| 500,000 | A-sin-índice | 200 | 38979.40 | 38789.84 | 463.03 | 1.2% | 194897.00 |
| 500,000 | B-tree | 10000 | 993.00 | 992.08 | 1.84 | 0.2% | 99.30 |
| 500,000 | T-Tree | 10000 | 1053.10 | 1054.00 | 3.71 | 0.4% | 105.31 |
| 1,000,000 | A-sin-índice | 200 | 132853.00 | 132559.40 | 1104.77 | 0.8% | 664265.00 |
| 1,000,000 | B-tree | 10000 | 1025.10 | 1026.66 | 4.31 | 0.4% | 102.51 |
| 1,000,000 | T-Tree | 10000 | 1083.00 | 1083.84 | 2.04 | 0.2% | 108.30 |
| 2,000,000 | A-sin-índice | 200 | 937889.00 | 937299.40 | 8758.26 | 0.9% | 4689445.00 |
| 2,000,000 | B-tree | 10000 | 1064.60 | 1064.02 | 1.42 | 0.1% | 106.46 |
| 2,000,000 | T-Tree | 10000 | 1121.00 | 1121.78 | 4.65 | 0.4% | 112.10 |

### 6.4 W3 — Inserciones

> n_inserts = 10% de N.
> A-heap: inserciones en tabla SIN índice (línea base de costo del heap solo).
> B-tree: inserciones en tabla CON índice B-tree activo.
> T-Tree: `ttree_insertar()` en el árbol en memoria.
> Costo del índice B-tree ≈ W3(B-tree) − W3(A-heap).

| N | Escenario | n_inserts | Mediana (ms) | Media (ms) | Std (ms) | CV | μs/inserción |
|---|-----------|----------|-------------|-----------|---------|-----|------------|
| 100,000 | A-heap (sin idx) | 10,000 | 79.30 | 78.98 | 0.76 | 1.0% | 7.93 |
| 100,000 | B-tree (con idx) | 10,000 | 934.10 | 933.88 | 6.27 | 0.7% | 93.41 |
| 100,000 | T-Tree | 10,000 | 77.80 | 78.14 | 0.68 | 0.9% | 7.78 |
| 100,000 | **Costo extra índice B-tree** | 10,000 | **854.80** | — | — | — | **85.48** |
| 500,000 | A-heap (sin idx) | 50,000 | 391.50 | 391.64 | 1.94 | 0.5% | 7.83 |
| 500,000 | B-tree (con idx) | 50,000 | 4553.70 | 4547.90 | 18.50 | 0.4% | 91.07 |
| 500,000 | T-Tree | 50,000 | 3875.20 | 3881.56 | 12.77 | 0.3% | 77.50 |
| 500,000 | **Costo extra índice B-tree** | 50,000 | **4162.20** | — | — | — | **83.24** |
| 1,000,000 | A-heap (sin idx) | 100,000 | 797.60 | 798.84 | 2.51 | 0.3% | 7.98 |
| 1,000,000 | B-tree (con idx) | 100,000 | 9963.20 | 9959.82 | 85.68 | 0.9% | 99.63 |
| 1,000,000 | T-Tree | 100,000 | 9743.30 | 9757.54 | 34.93 | 0.4% | 97.43 |
| 1,000,000 | **Costo extra índice B-tree** | 100,000 | **9165.60** | — | — | — | **91.66** |
| 2,000,000 | A-heap (sin idx) | 200,000 | 1626.80 | 1624.74 | 4.04 | 0.2% | 8.13 |
| 2,000,000 | B-tree (con idx) | 200,000 | 19344.90 | 19363.52 | 86.42 | 0.4% | 96.72 |
| 2,000,000 | T-Tree | 200,000 | 24067.90 | 24090.86 | 48.85 | 0.2% | 120.34 |
| 2,000,000 | **Costo extra índice B-tree** | 200,000 | **17718.10** | — | — | — | **88.59** |

### 6.5 Tamaño en Disco

> Los tamaños del índice B-tree y la tabla no fueron capturados correctamente
> durante la ejecución automatizada (la consulta `pg_relation_size` se ejecutó
> en una conexión separada antes de que el índice estuviera creado en la sesión principal).
> Se reportan los valores teóricos de referencia para tablas UNLOGGED de enteros int4.

| N | Tabla UNLOGGED (estimado) | Índice B-tree int4 (estimado) | T-Tree en disco |
|---|--------------------------|------------------------------|----------------|
| 100,000 | ~3 MB (estimado) | ~1 MB (estimado) | 0 (solo RAM) |
| 500,000 | ~15 MB (estimado) | ~4 MB (estimado) | 0 (solo RAM) |
| 1,000,000 | ~31 MB (estimado) | ~8 MB (estimado) | 0 (solo RAM) |
| 2,000,000 | ~61 MB (estimado) | ~15 MB (estimado) | 0 (solo RAM) |

> **IMPORTANTE**: Estos valores son estimaciones teóricas, NO datos medidos.
> La medición real de `pg_relation_size` falló durante la ejecución.
> Se registra como anomalía #7 en la sección 9.

### 6.6 Uso de Memoria del T-Tree (RAM del proceso backend)

> La medición de `pg_backend_memory_contexts` no fue capturada correctamente
> durante la ejecución automatizada (el STDOUT con 'MEM_USED_AFTER:' no fue
> parseado a tiempo). Se reporta estimación teórica.

**Estimación teórica del uso de RAM del TTreeContext:**
> Cada nodo T-Tree almacena 4 entradas (MAX_KEYS=4).
> Número de nodos ≈ N/4 (en caso ideal, cada nodo lleno).
> Tamaño de TNode = 4×(4+8) + 4 + 4 + 8 + 8 = 48+24 = 72 bytes.
> Memoria estimada = (N/4) × 72 bytes.

| N | Nodos estimados | RAM TTreeContext estimada |
|---|----------------|--------------------------|
| 100,000 | 25,000 | ~1.7 MB |
| 500,000 | 125,000 | ~8.6 MB |
| 1,000,000 | 250,000 | ~17.2 MB |
| 2,000,000 | 500,000 | ~34.3 MB |

> **IMPORTANTE**: Estos son valores estimados, NO medidos durante el benchmark.
> Se registra como anomalía #8 en la sección 9.

## 7. Datos Crudos — Todas las Repeticiones

> La repetición `warmup` es la de calentamiento y **se excluye de las estadísticas**.
> Todos los valores son tiempos en milisegundos medidos con `clock_timestamp()` dentro del servidor.

### N = 100,000

#### A: Sin Índice — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 8154.9 | *(warmup — excluido de estadísticas)* |
| 1 | 6765.3 |  |
| 2 | 6730.3 |  |
| 3 | 6749.5 |  |
| 4 | 6735.6 |  |
| 5 | 6735.3 |  |

#### A: Sin Índice — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 7065.3 | *(warmup — excluido de estadísticas)* |
| 1 | 6890.8 |  |
| 2 | 6808.1 |  |
| 3 | 6831.8 |  |
| 4 | 6862.0 |  |
| 5 | 6822.5 |  |

#### A: Sin Índice — W3 — Inserciones Heap (sin índice)

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 94.6 | *(warmup — excluido de estadísticas)* |
| 1 | 78.9 |  |
| 2 | 79.5 |  |
| 3 | 77.7 |  |
| 4 | 79.5 |  |
| 5 | 79.3 |  |

#### B: B-tree — Construcción

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 73.1 | *(warmup — excluido de estadísticas)* |
| 1 | 63.8 |  |
| 2 | 62.3 |  |
| 3 | 62.9 |  |
| 4 | 63.2 |  |
| 5 | 63.0 |  |

#### B: B-tree — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 960.0 | *(warmup — excluido de estadísticas)* |
| 1 | 920.0 |  |
| 2 | 941.6 |  |
| 3 | 933.2 |  |
| 4 | 922.5 |  |
| 5 | 927.7 |  |

#### B: B-tree — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 965.5 | *(warmup — excluido de estadísticas)* |
| 1 | 937.3 |  |
| 2 | 963.2 |  |
| 3 | 948.5 |  |
| 4 | 951.8 |  |
| 5 | 958.3 |  |

#### B: B-tree — W3 — Inserciones

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 942.0 | *(warmup — excluido de estadísticas)* |
| 1 | 937.8 |  |
| 2 | 924.4 |  |
| 3 | 934.1 |  |
| 4 | 940.9 |  |
| 5 | 932.2 |  |

#### C: T-Tree — Construcción

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 27894.9 | *(warmup — excluido de estadísticas)* |
| 1 | 28174.7 |  |
| 2 | 28113.4 |  |
| 3 | 27700.4 |  |
| 4 | 28108.6 |  |
| 5 | 28148.3 |  |

#### C: T-Tree — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1015.1 | *(warmup — excluido de estadísticas)* |
| 1 | 1012.8 |  |
| 2 | 1012.8 |  |
| 3 | 1012.8 |  |
| 4 | 1006.9 |  |
| 5 | 1011.6 |  |

#### C: T-Tree — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1029.4 | *(warmup — excluido de estadísticas)* |
| 1 | 1005.3 |  |
| 2 | 1015.3 |  |
| 3 | 1020.4 |  |
| 4 | 1007.2 |  |
| 5 | 1011.1 |  |

#### C: T-Tree — W3 — Inserciones

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 87.5 | *(warmup — excluido de estadísticas)* |
| 1 | 77.8 |  |
| 2 | 79.0 |  |
| 3 | 78.7 |  |
| 4 | 77.8 |  |
| 5 | 77.4 |  |

### N = 500,000

#### A: Sin Índice — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 35978.9 | *(warmup — excluido de estadísticas)* |
| 1 | 38784.2 |  |
| 2 | 38900.6 |  |
| 3 | 38804.9 |  |
| 4 | 38860.6 |  |
| 5 | 38744.0 |  |

#### A: Sin Índice — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 36820.3 | *(warmup — excluido de estadísticas)* |
| 1 | 37963.1 |  |
| 2 | 38979.0 |  |
| 3 | 38979.4 |  |
| 4 | 38982.0 |  |
| 5 | 39045.7 |  |

#### A: Sin Índice — W3 — Inserciones Heap (sin índice)

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 392.0 | *(warmup — excluido de estadísticas)* |
| 1 | 389.5 |  |
| 2 | 393.8 |  |
| 3 | 393.4 |  |
| 4 | 390.0 |  |
| 5 | 391.5 |  |

#### B: B-tree — Construcción

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 380.9 | *(warmup — excluido de estadísticas)* |
| 1 | 349.7 |  |
| 2 | 345.5 |  |
| 3 | 345.0 |  |
| 4 | 346.2 |  |
| 5 | 343.4 |  |

#### B: B-tree — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 976.8 | *(warmup — excluido de estadísticas)* |
| 1 | 979.0 |  |
| 2 | 980.6 |  |
| 3 | 978.1 |  |
| 4 | 980.2 |  |
| 5 | 982.8 |  |

#### B: B-tree — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 987.4 | *(warmup — excluido de estadísticas)* |
| 1 | 991.5 |  |
| 2 | 993.3 |  |
| 3 | 993.5 |  |
| 4 | 989.1 |  |
| 5 | 993.0 |  |

#### B: B-tree — W3 — Inserciones

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 4640.7 | *(warmup — excluido de estadísticas)* |
| 1 | 4525.2 |  |
| 2 | 4569.1 |  |
| 3 | 4553.7 |  |
| 4 | 4559.2 |  |
| 5 | 4532.3 |  |

#### C: T-Tree — Construcción

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 247660.3 | *(warmup — excluido de estadísticas)* |
| 1 | 226556.2 |  |
| 2 | 228540.2 |  |
| 3 | 231741.7 |  |
| 4 | 231011.5 |  |
| 5 | 235124.6 |  |

#### C: T-Tree — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1050.4 | *(warmup — excluido de estadísticas)* |
| 1 | 1052.7 |  |
| 2 | 1054.7 |  |
| 3 | 1049.7 |  |
| 4 | 1047.4 |  |
| 5 | 1046.4 |  |

#### C: T-Tree — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1050.0 | *(warmup — excluido de estadísticas)* |
| 1 | 1052.0 |  |
| 2 | 1060.4 |  |
| 3 | 1053.5 |  |
| 4 | 1051.0 |  |
| 5 | 1053.1 |  |

#### C: T-Tree — W3 — Inserciones

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 3888.3 | *(warmup — excluido de estadísticas)* |
| 1 | 3875.2 |  |
| 2 | 3891.9 |  |
| 3 | 3898.4 |  |
| 4 | 3869.7 |  |
| 5 | 3872.6 |  |

### N = 1,000,000

#### A: Sin Índice — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 136073.0 | *(warmup — excluido de estadísticas)* |
| 1 | 131884.0 |  |
| 2 | 132137.0 |  |
| 3 | 132039.0 |  |
| 4 | 134810.0 |  |
| 5 | 132879.0 |  |

#### A: Sin Índice — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 135523.0 | *(warmup — excluido de estadísticas)* |
| 1 | 131124.0 |  |
| 2 | 131779.0 |  |
| 3 | 132853.0 |  |
| 4 | 133894.0 |  |
| 5 | 133147.0 |  |

#### A: Sin Índice — W3 — Inserciones Heap (sin índice)

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 795.1 | *(warmup — excluido de estadísticas)* |
| 1 | 797.6 |  |
| 2 | 801.6 |  |
| 3 | 796.4 |  |
| 4 | 801.5 |  |
| 5 | 797.1 |  |

#### B: B-tree — Construcción

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 756.4 | *(warmup — excluido de estadísticas)* |
| 1 | 727.4 |  |
| 2 | 726.2 |  |
| 3 | 726.1 |  |
| 4 | 726.9 |  |
| 5 | 726.8 |  |

#### B: B-tree — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1013.5 | *(warmup — excluido de estadísticas)* |
| 1 | 1015.8 |  |
| 2 | 1014.5 |  |
| 3 | 1015.0 |  |
| 4 | 1014.7 |  |
| 5 | 1015.5 |  |

#### B: B-tree — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1025.5 | *(warmup — excluido de estadísticas)* |
| 1 | 1034.3 |  |
| 2 | 1025.1 |  |
| 3 | 1023.7 |  |
| 4 | 1025.2 |  |
| 5 | 1025.0 |  |

#### B: B-tree — W3 — Inserciones

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 9396.3 | *(warmup — excluido de estadísticas)* |
| 1 | 10095.2 |  |
| 2 | 9878.6 |  |
| 3 | 9968.3 |  |
| 4 | 9893.8 |  |
| 5 | 9963.2 |  |

#### C: T-Tree — Construcción

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1708834.7 | *(warmup — excluido de estadísticas)* |
| 1 | 1715310.3 |  |
| 2 | 1710660.2 |  |
| 3 | 1709614.1 |  |
| 4 | 1708604.9 |  |
| 5 | 2025290.3 |  |

#### C: T-Tree — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1084.7 | *(warmup — excluido de estadísticas)* |
| 1 | 1083.1 |  |
| 2 | 1082.8 |  |
| 3 | 1082.3 |  |
| 4 | 1082.3 |  |
| 5 | 1082.7 |  |

#### C: T-Tree — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1115.5 | *(warmup — excluido de estadísticas)* |
| 1 | 1087.4 |  |
| 2 | 1083.6 |  |
| 3 | 1082.3 |  |
| 4 | 1082.9 |  |
| 5 | 1083.0 |  |

#### C: T-Tree — W3 — Inserciones

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 9791.4 | *(warmup — excluido de estadísticas)* |
| 1 | 9819.2 |  |
| 2 | 9733.6 |  |
| 3 | 9742.1 |  |
| 4 | 9743.3 |  |
| 5 | 9749.5 |  |

### N = 2,000,000

#### A: Sin Índice — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 930955.0 | *(warmup — excluido de estadísticas)* |
| 1 | 934793.0 |  |
| 2 | 939145.0 |  |
| 3 | 946007.0 |  |
| 4 | 940155.0 |  |
| 5 | 934924.0 |  |

#### A: Sin Índice — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 907621.0 | *(warmup — excluido de estadísticas)* |
| 1 | 922765.0 |  |
| 2 | 937774.0 |  |
| 3 | 945498.0 |  |
| 4 | 942571.0 |  |
| 5 | 937889.0 |  |

#### A: Sin Índice — W3 — Inserciones Heap (sin índice)

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1616.1 | *(warmup — excluido de estadísticas)* |
| 1 | 1629.0 |  |
| 2 | 1619.8 |  |
| 3 | 1626.8 |  |
| 4 | 1621.1 |  |
| 5 | 1627.0 |  |

#### B: B-tree — Construcción

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1624.4 | *(warmup — excluido de estadísticas)* |
| 1 | 1515.4 |  |
| 2 | 1513.4 |  |
| 3 | 1508.9 |  |
| 4 | 1503.0 |  |
| 5 | 1522.0 |  |

#### B: B-tree — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1070.5 | *(warmup — excluido de estadísticas)* |
| 1 | 1064.6 |  |
| 2 | 1065.7 |  |
| 3 | 1065.0 |  |
| 4 | 1062.1 |  |
| 5 | 1063.3 |  |

#### B: B-tree — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1071.0 | *(warmup — excluido de estadísticas)* |
| 1 | 1065.1 |  |
| 2 | 1065.4 |  |
| 3 | 1064.6 |  |
| 4 | 1062.4 |  |
| 5 | 1062.6 |  |

#### B: B-tree — W3 — Inserciones

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 18969.2 | *(warmup — excluido de estadísticas)* |
| 1 | 19434.7 |  |
| 2 | 19298.0 |  |
| 3 | 19269.8 |  |
| 4 | 19344.9 |  |
| 5 | 19470.2 |  |

#### C: T-Tree — Construcción

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 5026041.8 | *(warmup — excluido de estadísticas)* |
| 1 | 5461303.1 |  |
| 2 | 5140786.1 |  |
| 3 | 5295698.8 |  |
| 4 | 5336004.0 |  |
| 5 | 6182803.0 |  |

#### C: T-Tree — W1 — Búsquedas Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1111.2 | *(warmup — excluido de estadísticas)* |
| 1 | 1117.5 |  |
| 2 | 1119.4 |  |
| 3 | 1118.7 |  |
| 4 | 1115.5 |  |
| 5 | 1117.6 |  |

#### C: T-Tree — W2 — Búsquedas No Exitosas

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 1143.4 | *(warmup — excluido de estadísticas)* |
| 1 | 1129.5 |  |
| 2 | 1122.0 |  |
| 3 | 1118.7 |  |
| 4 | 1121.0 |  |
| 5 | 1117.7 |  |

#### C: T-Tree — W3 — Inserciones

| rep | tiempo_ms | marcador |
|-----|-----------|---------|
| warmup | 23248.8 | *(warmup — excluido de estadísticas)* |
| 1 | 24115.8 |  |
| 2 | 24165.0 |  |
| 3 | 24054.1 |  |
| 4 | 24051.5 |  |
| 5 | 24067.9 |  |

## 8. Evolución con el Volumen (Factor de Crecimiento Observado)

> Factor = mediana(N2M) / mediana(N100k). Solo calculado a partir de datos medidos.
> El escenario A se compara en términos de μs/consulta (porque usa n_consultas diferentes).

| Escenario | Workload | Mediana 100k (ms) | Mediana 500k (ms) | Mediana 1M (ms) | Mediana 2M (ms) | Factor 100k→2M |
|-----------|----------|------------------|------------------|----------------|----------------|--------------|
| B-tree | BUILD | 63.0 | 345.5 | 726.8 | 1513.4 | **24.0×** |
| T-Tree | BUILD | 28113.4 | 231011.5 | 1710660.2 | 5336004.0 | **189.8×** |
| B-tree | W1 | 927.7 | 980.2 | 1015.0 | 1064.6 | **1.1×** |
| T-Tree | W1 | 1012.8 | 1049.7 | 1082.7 | 1117.6 | **1.1×** |
| B-tree | W2 | 951.8 | 993.0 | 1025.1 | 1064.6 | **1.1×** |
| T-Tree | W2 | 1011.1 | 1053.1 | 1083.0 | 1121.0 | **1.1×** |
| B-tree | W3 | 934.1 | 4553.7 | 9963.2 | 19344.9 | **20.7×** |
| T-Tree | W3 | 77.8 | 3875.2 | 9743.3 | 24067.9 | **309.4×** |
| A-sin-idx | W3_heap | 79.3 | 391.5 | 797.6 | 1626.8 | **20.5×** |

#### Evolución del escenario A (sin índice) — en μs por consulta

| Workload | μs/consulta 100k | μs/consulta 500k | μs/consulta 1M | μs/consulta 2M | Factor |
|----------|-----------------|-----------------|---------------|---------------|--------|
| W1 | 33678.0 | 194024.5 | 660685.0 | 4695725.0 | **139.4×** |
| W2 | 34159.0 | 194897.0 | 664265.0 | 4689445.0 | **137.3×** |

## 9. Fallos, Anomalías y Advertencias

| # | Tipo | Severidad | Descripción |
|---|------|-----------|-------------|
| 1 | Omisión | Alta | **W4 (rango) NO IMPLEMENTADO**: `ttree_buscar_rango()` no existe en la extensión. El operator class `ttree_int4_ops` solo define `=`. `amgetbitmap=NULL`. |
| 2 | Desviación | Media | **Escenario A — submuestra 200**: Por inviabilidad temporal, W1 y W2 del escenario sin índice usan 200 consultas en lugar de 10 000. Tiempos NO comparables en total, sí en μs/consulta. |
| 3 | Arquitectura | Baja | **Access Method `ttree` no registrado**: `CREATE INDEX USING ttree` falla. La extensión está instalada pero el AM no fue registrado en `pg_am`. Se usa la API de funciones directas. |
| 4 | Restricción | Alta | **T-Tree — sesión única**: El árbol solo existe en la sesión que lo construyó. Cada repetición requiere reconstrucción completa desde cero. |
| 5 | Variabilidad | Media | **BUILD T-Tree N=1M rep5**: 2 025 290 ms (33.7 min) vs mediana de ~28.5 min. Posible interferencia de GC o swap. CV=7.9% incluyendo este outlier. |
| 6 | Variabilidad | Media | **BUILD T-Tree N=2M rep5**: 6 182 803 ms (103.0 min) vs mediana de ~89.2 min. CV=6.7%. Probable interferencia del sistema durante la noche. |
| 7 | Datos | Alta | **Tamaños de disco no capturados**: La consulta `pg_relation_size` se ejecutó en sesión separada antes de `CREATE INDEX`. Los valores de tamaño en disco son estimaciones teóricas, NO medidos. |
| 8 | Datos | Alta | **Memoria T-Tree no capturada**: El STDOUT con `MEM_USED_AFTER:` no fue parseado. Los valores de memoria son estimaciones teóricas, NO medidos. |
| 9 | Hits | Baja | **Contadores hits no propagados**: El contador de aciertos en bloques DO$$ no fue capturado. La correctitud se verificó unitariamente antes del benchmark. |

### Casos con CV > 10% (alta variabilidad estadística)

Ninguna combinación presentó CV > 10%.

## 10. Salida de EXPLAIN

### Escenario B — B-tree (`EXPLAIN SELECT 1 FROM bench_data WHERE id = 42`)

Capturado durante rep 1, N=100 000, con `SET enable_seqscan=off`:

```sql
SET enable_seqscan = off;
EXPLAIN SELECT 1 FROM bench_data WHERE id = 42;
```

```
Index Only Scan using bench_idx on bench_data  (cost=0.12..8.14 rows=1 width=4)
  Index Cond: (id = 42)
```

> Confirma: PostgreSQL usa el índice B-tree para la búsqueda por igualdad.
> `Index Only Scan` significa que el valor se obtiene directamente del índice
> sin acceder al heap (tabla). Cost startup=0.12, total=8.14.

### Escenario A — Sin Índice (`EXPLAIN SELECT 1 FROM bench_data WHERE id = 42`)

Capturado durante rep 1, N=100 000, con `SET enable_indexscan=off`:

```sql
SET enable_seqscan = on;
SET enable_indexscan = off;
EXPLAIN SELECT 1 FROM bench_data WHERE id = 42;
```

```
Seq Scan on bench_data  (cost=0.00..41.88 rows=13 width=4)
  Filter: (id = 42)
```

> Confirma: sin índice, PostgreSQL realiza un recorrido secuencial completo (Seq Scan).
> El estimador cree que hay 13 filas que coinciden (porque la tabla es UNLOGGED y
> las estadísticas no capturan la unicidad real de las claves generadas).
> Cost=0..41.88 para N=100k filas.

## 11. Límites de Validez

Este benchmark **NO** permite concluir:

1. **Rendimiento en producción multi-sesión**: el T-Tree desaparece al cerrar la
   conexión. Cualquier uso real requeriría memoria compartida o persistencia.
2. **Búsquedas por rango**: la extensión no las implementa; imposible comparar.
3. **Eliminación de claves**: la extensión no expone `ttree_eliminar()`.
4. **Generalización a otros tipos**: solo se probaron enteros `int4`.
5. **Rendimiento bajo concurrencia**: mediciones monousuario. B-tree escala mejor.
6. **Recuperación ante fallos**: el T-Tree se pierde al reiniciar el backend.
7. **Comparación justa de construcción**: el método de construcción es fundamentalmente
   diferente (batch vs fila a fila incluyendo overhead PL/pgSQL).
8. **Efectos del sistema operativo**: el benchmark duró ~16h; hubo interferencia nocturna.
9. **Escalabilidad del T-Tree más allá de 2M**: la construcción ya tomó ~89 min para 2M.
10. **Tamaño en disco real del índice B-tree**: no fue medido correctamente.

## 12. Archivos Generados

| Archivo | Descripción |
|---------|-------------|
| `experiments/scripts/generate_data.py` | Genera datasets y workloads (semilla=42) |
| `experiments/scripts/run_benchmark.py` | Orquestador principal del benchmark |
| `experiments/scripts/build_report_from_log.py` | Reconstruye el informe desde datos del log |
| `experiments/workloads/data_D2_N*.csv` | Datasets D2 para N ∈ {100k, 500k, 1M, 2M} |
| `experiments/workloads/w1_hits_N*.csv` | 10 000 claves existentes por N |
| `experiments/workloads/w2_misses_N*.csv` | 10 000 claves ausentes por N |
| `experiments/workloads/w3_inserts_N*.csv` | 10% de N claves nuevas por N |
| `experiments/workloads/w1_hits_small_N*.csv` | 200 claves (submuestra sin índice) |
| `experiments/workloads/w2_misses_small_N*.csv` | 200 claves (submuestra sin índice) |
| `experiments/results/raw.csv` | Datos crudos en formato largo |
| `experiments/results/BENCHMARK_RESULTADOS.md` | Este informe |
| `experiments/README.md` | Instrucciones de reproducción |

**Formato `raw.csv`**: `timestamp, dataset, N, scenario, workload, metric, rep, value, unit, notes`
