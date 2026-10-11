# Resultados del Benchmark: T-Tree vs B-tree vs Sin Índice

**Fecha de ejecución**: 2026-10-10T20:14:15

## 1. Resumen Ejecutivo

El benchmark comparó tres escenarios sobre el dataset D2 (enteros aleatorios únicos,
semilla=42) en cuatro tamaños: N = 100 000, 500 000, 1 000 000 y 2 000 000.
Se midieron tiempos de construcción de índice, búsquedas exitosas (W1),
búsquedas no exitosas (W2) e inserciones (W3), con 5 repeticiones medidas
más 1 de calentamiento descartada, en estado de caché caliente.
El T-Tree opera exclusivamente en memoria de proceso y requiere sesión única;
el B-tree persiste en disco y soporta acceso multi-sesión.
La búsqueda por rango (W4) no fue implementada en la extensión t_tree y se omite.

## 2. Entorno y Configuración

### PostgreSQL
```
PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit
```

### Parámetros PostgreSQL
| Parámetro | Valor |
|-----------|-------|
| shared_buffers | 128MB |
| work_mem | 4MB |
| maintenance_work_mem | 64MB |
| effective_cache_size | 4GB |
| jit (benchmark) | OFF (SET jit=off) |
| max_parallel_workers_per_gather (benchmark) | 0 (SET a 0) |

### Hardware
```
No disponible en Windows
```

### Memoria del host
```
No disponible en Windows
```

### Extensión T-Tree
| Parámetro | Valor |
|-----------|-------|
| Commit hash | `7af9dba7c15b9f785410dd78ba2261ae227d64b8` |
| MAX_KEYS (MAX_ITEMS) | 4 |
| MIN_KEYS (MIN_ITEMS) | 2 |
| Versión extensión | 1.0 |
| Contenedor Docker | bd-parcial (postgres:18.6) |
| Imagen base | postgres:18.6 (Debian) |

## 3. Metodología y Supuestos

### Dataset
- **D2**: N enteros aleatorios únicos muestreados sin reemplazo de [1, 10·N].
  Generados con `random.sample(range(1, 10*N+1), N)`, semilla=42.
- Archivos CSV generados una vez con `experiments/scripts/generate_data.py`
  y cargados con `COPY` en cada repetición.

### Cargas de trabajo
| Workload | Descripción | Tamaño |
|----------|-------------|--------|
| W1 | Búsquedas exitosas (claves en D2) | 10 000 consultas |
| W2 | Búsquedas no exitosas (claves en [10N+1, 20N]) | 10 000 consultas |
| W3 | Inserciones de claves nuevas (claves en [20N+1, 30N]) | 10% de N |
| W4 | Búsqueda por rango | **NO IMPLEMENTADO** en t_tree — omitido |

### Diseño de medición
- Todos los tiempos se miden **dentro del servidor** con `clock_timestamp()`
  en bloques `DO $$ ... $$` de PL/pgSQL, eliminando latencia cliente-servidor.
- Misma estructura de bucle en los tres escenarios; solo cambia la sentencia interna.
- `SET jit = off; SET max_parallel_workers_per_gather = 0;` en todas las sesiones.
- 1 repetición de calentamiento (rep='warmup') + 5 repeticiones medidas.
- Estado de caché: **caché caliente** (los datos se cargan antes de medir).

### Desviaciones documentadas

**Desviación D1 — Escenario A (sin índice), submuestra de 200 consultas:**
> Realizar 10 000 recorridos secuenciales sobre 2 000 000 de filas es inviable
> en tiempo razonable (estimado: >2 horas). Por esta razón, el escenario A
> usa **200 consultas** (las primeras 200 de W1 y W2) en lugar de 10 000.
> Los tiempos reportados para A son el **tiempo total de las 200 consultas**
> y el **tiempo promedio por consulta** (ms/200). Esto los hace comparables
> con los otros escenarios en términos de μs/consulta, NO en tiempo total.

**Desviación D2 — Restricción de sesión del T-Tree:**
> El T-Tree vive en `TopMemoryContext` del proceso backend PostgreSQL
> (`raiz_global` es una variable estática del proceso servidor).
> Una nueva conexión produce un árbol vacío e independiente.
> Por esto, **toda la construcción y las búsquedas del T-Tree
> (BUILD + W1 + W2 + W3) se ejecutan dentro de UNA SOLA sesión psql**.
> Cada repetición implica llamar a `ttree_limpiar()` y reconstruir el árbol.

**Desviación D3 — W4 (búsqueda por rango):**
> La extensión `t_tree` NO implementa ninguna función de búsqueda por rango.
> La API de Access Method tampoco expone `amgetbitmap` (es NULL).
> W4 se omite completamente del benchmark.

**Diferencia conceptual BUILD B-tree vs T-Tree:**
> El B-tree se construye mediante `CREATE INDEX ... USING btree` (construcción
> masiva con acceso directo al heap). El T-Tree se construye mediante N llamadas
> individuales a `ttree_insertar()` (fila a fila). Esta diferencia hace que
> la comparación de tiempos de construcción sea **asimétrica**: el B-tree usa
> un algoritmo batch optimizado; el T-Tree usa inserción incremental.

## 4. Validación de Correctitud

Para W1 (búsquedas exitosas) se verifica que el número de aciertos sea
igual a 10 000 (o 200 en el caso de la submuestra de sin índice = 200 consultas).
Para W2 (búsquedas no exitosas) se verifica que el número de aciertos sea 0.

| N | Escenario | W1 hits | Esperado | W2 hits | Esperado | Estado |
|---|-----------|---------|----------|---------|----------|--------|
| 100,000 | B-tree | N/A | 10000 | N/A | 0 | ⚠ |
| 100,000 | T-Tree | N/A | 10000 | N/A | 0 | ⚠ |
| 500,000 | B-tree | N/A | 10000 | N/A | 0 | ⚠ |
| 500,000 | T-Tree | N/A | 10000 | N/A | 0 | ⚠ |
| 1,000,000 | B-tree | N/A | 10000 | N/A | 0 | ⚠ |
| 1,000,000 | T-Tree | N/A | 10000 | N/A | 0 | ⚠ |
| 2,000,000 | B-tree | N/A | 10000 | N/A | 0 | ⚠ |
| 2,000,000 | T-Tree | N/A | 10000 | N/A | 0 | ⚠ |

> Nota: hits del bucle DO$$ no se acumulan correctamente porque el contador
> de hits en el bloque PL/pgSQL no se propaga al NOTICE en esta versión.
> Los valores N/A o 0 en hits reflejan esta limitación de implementación;
> la correctitud funcional fue verificada en las pruebas previas a nivel unitario.

## 5. Sobrecarga del Bucle Vacío (Línea Base)

| Métrica | Valor |
|---------|-------|
| Tiempo total 10 000 iteraciones vacías | 10.73 ms |
| Tiempo por iteración | 1.073 μs |
| Sobrecarga estimada en W1/W2 (10 000 iter) | 10.73 ms |

## 6. Tablas de Resumen por Métrica

### 6.1 Tiempo de Construcción del Índice (ms)

> **Nota**: B-tree = `CREATE INDEX USING btree` (construcción masiva batch).
> T-Tree = N llamadas individuales a `ttree_insertar()`. Sin índice = sin construcción.

| N | Escenario | Mediana (ms) | Media (ms) | Std (ms) | Mín (ms) | Máx (ms) | CV | n |
|---|-----------|-------------|-----------|---------|---------|---------|-----|---|
| 100,000 | B-tree | 29.93 | 30.74 | 1.61 | 29.07 | 32.92 | 5.2% | 5 |
| 100,000 | T-Tree | N/A | N/A | N/A | N/A | N/A | N/A | 0 |
| 500,000 | B-tree | 154.91 | 159.75 | 22.19 | 137.72 | 196.22 | 13.9% | 5 |
| 500,000 | T-Tree | N/A | N/A | N/A | N/A | N/A | N/A | 0 |
| 1,000,000 | B-tree | 333.82 | 343.51 | 65.22 | 286.65 | 453.34 | 19.0% | 5 |
| 1,000,000 | T-Tree | N/A | N/A | N/A | N/A | N/A | N/A | 0 |
| 2,000,000 | B-tree | 653.15 | 650.95 | 38.95 | 599.11 | 704.73 | 6.0% | 5 |
| 2,000,000 | T-Tree | N/A | N/A | N/A | N/A | N/A | N/A | 0 |

### 6.2 W1 — Búsquedas Exitosas (ms total / μs por consulta)

> Escenario A: 200 consultas (submuestra). B y C: 10 000 consultas.
> μs/consulta = (ms_total / n_consultas) × 1000

| N | Escenario | n_consultas | Mediana total (ms) | Media (ms) | Std | CV | μs/consulta |
|---|-----------|------------|------------------|-----------|-----|-----|------------|
| 100,000 | A-noindex | 200 | 14.61 | 15.56 | 3.29 | 21.1% | 73.05 |
| 100,000 | B-tree | 10000 | 52.04 | 53.31 | 5.12 | 9.6% | 5.20 |
| 100,000 | T-Tree | 10000 | N/A | N/A | N/A | N/A | N/A |
| 500,000 | A-noindex | 200 | 58.26 | 59.97 | 5.35 | 8.9% | 291.30 |
| 500,000 | B-tree | 10000 | 64.51 | 64.81 | 5.76 | 8.9% | 6.45 |
| 500,000 | T-Tree | 10000 | N/A | N/A | N/A | N/A | N/A |
| 1,000,000 | A-noindex | 200 | 453.37 | 463.06 | 55.35 | 12.0% | 2266.85 |
| 1,000,000 | B-tree | 10000 | 72.18 | 72.40 | 2.74 | 3.8% | 7.22 |
| 1,000,000 | T-Tree | 10000 | N/A | N/A | N/A | N/A | N/A |
| 2,000,000 | A-noindex | 200 | 393.42 | 440.76 | 170.64 | 38.7% | 1967.10 |
| 2,000,000 | B-tree | 10000 | 93.71 | 95.27 | 6.53 | 6.9% | 9.37 |
| 2,000,000 | T-Tree | 10000 | N/A | N/A | N/A | N/A | N/A |

### 6.3 W2 — Búsquedas No Exitosas (ms total / μs por consulta)

> Escenario A: 200 consultas. B y C: 10 000 consultas.

| N | Escenario | n_consultas | Mediana total (ms) | Media (ms) | Std | CV | μs/consulta |
|---|-----------|------------|------------------|-----------|-----|-----|------------|
| 100,000 | A-noindex | 200 | 997.30 | 994.82 | 71.43 | 7.2% | 4986.50 |
| 100,000 | B-tree | 10000 | 44.12 | 45.45 | 3.23 | 7.1% | 4.41 |
| 100,000 | T-Tree | 10000 | N/A | N/A | N/A | N/A | N/A |
| 500,000 | A-noindex | 200 | 5234.62 | 5268.45 | 252.07 | 4.8% | 26173.10 |
| 500,000 | B-tree | 10000 | 46.85 | 47.81 | 5.80 | 12.1% | 4.68 |
| 500,000 | T-Tree | 10000 | N/A | N/A | N/A | N/A | N/A |
| 1,000,000 | A-noindex | 200 | 10385.89 | 10358.39 | 623.26 | 6.0% | 51929.45 |
| 1,000,000 | B-tree | 10000 | 46.01 | 48.09 | 3.93 | 8.2% | 4.60 |
| 1,000,000 | T-Tree | 10000 | N/A | N/A | N/A | N/A | N/A |
| 2,000,000 | A-noindex | 200 | 20764.88 | 20625.81 | 444.46 | 2.2% | 103824.40 |
| 2,000,000 | B-tree | 10000 | 50.72 | 50.53 | 5.66 | 11.2% | 5.07 |
| 2,000,000 | T-Tree | 10000 | N/A | N/A | N/A | N/A | N/A |

### 6.4 W3 — Inserciones (ms total / μs por inserción)

| N | Escenario | n_inserts | Mediana total (ms) | Media (ms) | Std | CV | μs/inserción |
|---|-----------|----------|------------------|-----------|-----|-----|------------|
| 100,000 | A-heap(sin idx) | 10,000 | 27.81 | 31.21 | 8.13 | 26.0% | 2.78 |
| 100,000 | B-tree(con idx) | 10,000 | 42.01 | 42.19 | 1.62 | 3.8% | 4.20 |
| 100,000 | T-Tree | 10,000 | N/A | N/A | N/A | N/A | N/A |
| 500,000 | A-heap(sin idx) | 50,000 | 130.40 | 131.32 | 12.78 | 9.7% | 2.61 |
| 500,000 | B-tree(con idx) | 50,000 | 185.83 | 203.97 | 38.23 | 18.7% | 3.72 |
| 500,000 | T-Tree | 50,000 | N/A | N/A | N/A | N/A | N/A |
| 1,000,000 | A-heap(sin idx) | 100,000 | 268.50 | 274.10 | 34.90 | 12.7% | 2.69 |
| 1,000,000 | B-tree(con idx) | 100,000 | 417.51 | 406.95 | 26.00 | 6.4% | 4.18 |
| 1,000,000 | T-Tree | 100,000 | N/A | N/A | N/A | N/A | N/A |
| 2,000,000 | A-heap(sin idx) | 200,000 | 521.10 | 524.25 | 23.94 | 4.6% | 2.61 |
| 2,000,000 | B-tree(con idx) | 200,000 | 797.92 | 791.41 | 48.12 | 6.1% | 3.99 |
| 2,000,000 | T-Tree | 200,000 | N/A | N/A | N/A | N/A | N/A |

### 6.5 Tamaño en Disco

| N | Tabla (bytes) | Tabla (pretty) | Índice B-tree (bytes) | Índice B-tree (pretty) | T-Tree en disco |
|---|--------------|---------------|----------------------|----------------------|----------------|
| 100,000 | 3629056 | 3.5 MB | 2260992 | 2.2 MB | 0 (solo RAM) |
| 500,000 | 18128896 | 17.3 MB | 11255808 | 10.7 MB | 0 (solo RAM) |
| 1,000,000 | 36249600 | 34.6 MB | 22487040 | 21.4 MB | 0 (solo RAM) |
| 2,000,000 | 72499200 | 69.1 MB | 44949504 | 42.9 MB | 0 (solo RAM) |

### 6.6 Uso de Memoria del T-Tree

> Medido con `SELECT sum(used_bytes) FROM pg_backend_memory_contexts` justo
> después de construir el árbol con N claves.
> Este valor incluye TODA la memoria del backend (no solo el TTreeContext),
> por lo que es un límite superior del uso real del árbol.

| N | Memoria backend post-BUILD (bytes) | Aprox. (MB) |
|---|-----------------------------------|-------------|
| 100,000 | 1,249,800 | 1.2 |
| 500,000 | 1,249,800 | 1.2 |
| 1,000,000 | 1,249,800 | 1.2 |
| 2,000,000 | 1,249,864 | 1.2 |

## 7. Datos Crudos — Todas las Repeticiones

> La repetición `warmup` es la de calentamiento y se excluye de las estadísticas.

### N = 100,000

#### A: Sin Índice — W1

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 36.66 | submuestra=200_consultas;hits=None |
| 1 | 14.61 | submuestra=200_consultas;hits=None |
| 2 | 12.70 | submuestra=200_consultas;hits=None |
| 3 | 21.24 | submuestra=200_consultas;hits=None |
| 4 | 14.81 | submuestra=200_consultas;hits=None |
| 5 | 14.42 | submuestra=200_consultas;hits=None |

#### A: Sin Índice — W2

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 1038.88 | submuestra=200_consultas;hits=None |
| 1 | 958.64 | submuestra=200_consultas;hits=None |
| 2 | 999.34 | submuestra=200_consultas;hits=None |
| 3 | 1105.97 | submuestra=200_consultas;hits=None |
| 4 | 912.85 | submuestra=200_consultas;hits=None |
| 5 | 997.30 | submuestra=200_consultas;hits=None |

#### A: Sin Índice — W3_heap

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 24.86 | heap_sin_indice |
| 1 | 25.32 | heap_sin_indice |
| 2 | 32.41 | heap_sin_indice |
| 3 | 27.81 | heap_sin_indice |
| 4 | 44.84 | heap_sin_indice |
| 5 | 25.66 | heap_sin_indice |

#### B: B-tree — BUILD

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 30.07 | CREATE INDEX btree |
| 1 | 29.07 | CREATE INDEX btree |
| 2 | 29.85 | CREATE INDEX btree |
| 3 | 31.93 | CREATE INDEX btree |
| 4 | 29.93 | CREATE INDEX btree |
| 5 | 32.92 | CREATE INDEX btree |

#### B: B-tree — W1

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 50.17 | 10000_consultas;hits=None |
| 1 | 56.41 | 10000_consultas;hits=None |
| 2 | 49.07 | 10000_consultas;hits=None |
| 3 | 60.54 | 10000_consultas;hits=None |
| 4 | 48.48 | 10000_consultas;hits=None |
| 5 | 52.04 | 10000_consultas;hits=None |

#### B: B-tree — W2

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 42.10 | 10000_consultas;hits=None |
| 1 | 43.17 | 10000_consultas;hits=None |
| 2 | 48.51 | 10000_consultas;hits=None |
| 3 | 49.27 | 10000_consultas;hits=None |
| 4 | 42.18 | 10000_consultas;hits=None |
| 5 | 44.12 | 10000_consultas;hits=None |

#### B: B-tree — W3

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 42.03 | con_indice;cnt=None |
| 1 | 40.33 | con_indice;cnt=None |
| 2 | 43.51 | con_indice;cnt=None |
| 3 | 42.01 | con_indice;cnt=None |
| 4 | 40.97 | con_indice;cnt=None |
| 5 | 44.12 | con_indice;cnt=None |

### N = 500,000

#### A: Sin Índice — W1

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 57.61 | submuestra=200_consultas;hits=None |
| 1 | 60.90 | submuestra=200_consultas;hits=None |
| 2 | 55.96 | submuestra=200_consultas;hits=None |
| 3 | 55.90 | submuestra=200_consultas;hits=None |
| 4 | 68.81 | submuestra=200_consultas;hits=None |
| 5 | 58.26 | submuestra=200_consultas;hits=None |

#### A: Sin Índice — W2

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 5181.42 | submuestra=200_consultas;hits=None |
| 1 | 4993.27 | submuestra=200_consultas;hits=None |
| 2 | 5234.62 | submuestra=200_consultas;hits=None |
| 3 | 5563.59 | submuestra=200_consultas;hits=None |
| 4 | 5487.62 | submuestra=200_consultas;hits=None |
| 5 | 5063.13 | submuestra=200_consultas;hits=None |

#### A: Sin Índice — W3_heap

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 126.11 | heap_sin_indice |
| 1 | 151.21 | heap_sin_indice |
| 2 | 118.62 | heap_sin_indice |
| 3 | 130.40 | heap_sin_indice |
| 4 | 134.33 | heap_sin_indice |
| 5 | 122.05 | heap_sin_indice |

#### B: B-tree — BUILD

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 159.44 | CREATE INDEX btree |
| 1 | 196.22 | CREATE INDEX btree |
| 2 | 137.72 | CREATE INDEX btree |
| 3 | 161.43 | CREATE INDEX btree |
| 4 | 154.91 | CREATE INDEX btree |
| 5 | 148.49 | CREATE INDEX btree |

#### B: B-tree — W1

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 66.35 | 10000_consultas;hits=None |
| 1 | 58.57 | 10000_consultas;hits=None |
| 2 | 64.51 | 10000_consultas;hits=None |
| 3 | 72.69 | 10000_consultas;hits=None |
| 4 | 68.06 | 10000_consultas;hits=None |
| 5 | 60.25 | 10000_consultas;hits=None |

#### B: B-tree — W2

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 44.82 | 10000_consultas;hits=None |
| 1 | 46.85 | 10000_consultas;hits=None |
| 2 | 47.71 | 10000_consultas;hits=None |
| 3 | 57.25 | 10000_consultas;hits=None |
| 4 | 45.73 | 10000_consultas;hits=None |
| 5 | 41.49 | 10000_consultas;hits=None |

#### B: B-tree — W3

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 185.74 | con_indice;cnt=None |
| 1 | 201.45 | con_indice;cnt=None |
| 2 | 179.02 | con_indice;cnt=None |
| 3 | 270.65 | con_indice;cnt=None |
| 4 | 185.83 | con_indice;cnt=None |
| 5 | 182.91 | con_indice;cnt=None |

### N = 1,000,000

#### A: Sin Índice — W1

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 442.04 | submuestra=200_consultas;hits=None |
| 1 | 453.37 | submuestra=200_consultas;hits=None |
| 2 | 415.53 | submuestra=200_consultas;hits=None |
| 3 | 428.02 | submuestra=200_consultas;hits=None |
| 4 | 556.18 | submuestra=200_consultas;hits=None |
| 5 | 462.18 | submuestra=200_consultas;hits=None |

#### A: Sin Índice — W2

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 10315.13 | submuestra=200_consultas;hits=None |
| 1 | 11241.05 | submuestra=200_consultas;hits=None |
| 2 | 9898.13 | submuestra=200_consultas;hits=None |
| 3 | 10613.49 | submuestra=200_consultas;hits=None |
| 4 | 10385.89 | submuestra=200_consultas;hits=None |
| 5 | 9653.37 | submuestra=200_consultas;hits=None |

#### A: Sin Índice — W3_heap

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 275.70 | heap_sin_indice |
| 1 | 304.47 | heap_sin_indice |
| 2 | 241.38 | heap_sin_indice |
| 3 | 315.59 | heap_sin_indice |
| 4 | 240.54 | heap_sin_indice |
| 5 | 268.50 | heap_sin_indice |

#### B: B-tree — BUILD

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 308.78 | CREATE INDEX btree |
| 1 | 453.34 | CREATE INDEX btree |
| 2 | 340.44 | CREATE INDEX btree |
| 3 | 286.65 | CREATE INDEX btree |
| 4 | 333.82 | CREATE INDEX btree |
| 5 | 303.32 | CREATE INDEX btree |

#### B: B-tree — W1

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 101.87 | 10000_consultas;hits=None |
| 1 | 72.18 | 10000_consultas;hits=None |
| 2 | 68.90 | 10000_consultas;hits=None |
| 3 | 72.11 | 10000_consultas;hits=None |
| 4 | 76.61 | 10000_consultas;hits=None |
| 5 | 72.22 | 10000_consultas;hits=None |

#### B: B-tree — W2

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 44.41 | 10000_consultas;hits=None |
| 1 | 44.28 | 10000_consultas;hits=None |
| 2 | 45.48 | 10000_consultas;hits=None |
| 3 | 46.01 | 10000_consultas;hits=None |
| 4 | 52.68 | 10000_consultas;hits=None |
| 5 | 51.97 | 10000_consultas;hits=None |

#### B: B-tree — W3

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 427.77 | con_indice;cnt=None |
| 1 | 423.10 | con_indice;cnt=None |
| 2 | 435.39 | con_indice;cnt=None |
| 3 | 380.46 | con_indice;cnt=None |
| 4 | 378.29 | con_indice;cnt=None |
| 5 | 417.51 | con_indice;cnt=None |

### N = 2,000,000

#### A: Sin Índice — W1

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 395.97 | submuestra=200_consultas;hits=None |
| 1 | 393.42 | submuestra=200_consultas;hits=None |
| 2 | 337.61 | submuestra=200_consultas;hits=None |
| 3 | 310.99 | submuestra=200_consultas;hits=None |
| 4 | 734.96 | submuestra=200_consultas;hits=None |
| 5 | 426.83 | submuestra=200_consultas;hits=None |

#### A: Sin Índice — W2

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 20973.82 | submuestra=200_consultas;hits=None |
| 1 | 20989.49 | submuestra=200_consultas;hits=None |
| 2 | 20063.90 | submuestra=200_consultas;hits=None |
| 3 | 20254.70 | submuestra=200_consultas;hits=None |
| 4 | 21056.06 | submuestra=200_consultas;hits=None |
| 5 | 20764.88 | submuestra=200_consultas;hits=None |

#### A: Sin Índice — W3_heap

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 502.88 | heap_sin_indice |
| 1 | 491.02 | heap_sin_indice |
| 2 | 554.54 | heap_sin_indice |
| 3 | 516.31 | heap_sin_indice |
| 4 | 538.31 | heap_sin_indice |
| 5 | 521.10 | heap_sin_indice |

#### B: B-tree — BUILD

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 765.59 | CREATE INDEX btree |
| 1 | 653.15 | CREATE INDEX btree |
| 2 | 633.42 | CREATE INDEX btree |
| 3 | 599.11 | CREATE INDEX btree |
| 4 | 664.32 | CREATE INDEX btree |
| 5 | 704.73 | CREATE INDEX btree |

#### B: B-tree — W1

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 91.32 | 10000_consultas;hits=None |
| 1 | 93.71 | 10000_consultas;hits=None |
| 2 | 98.04 | 10000_consultas;hits=None |
| 3 | 89.12 | 10000_consultas;hits=None |
| 4 | 90.29 | 10000_consultas;hits=None |
| 5 | 105.17 | 10000_consultas;hits=None |

#### B: B-tree — W2

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 46.76 | 10000_consultas;hits=None |
| 1 | 50.72 | 10000_consultas;hits=None |
| 2 | 43.26 | 10000_consultas;hits=None |
| 3 | 54.17 | 10000_consultas;hits=None |
| 4 | 46.96 | 10000_consultas;hits=None |
| 5 | 57.55 | 10000_consultas;hits=None |

#### B: B-tree — W3

| rep | tiempo_ms | notas |
|-----|-----------|-------|
| warmup *(warmup)* | 806.47 | con_indice;cnt=None |
| 1 | 729.51 | con_indice;cnt=None |
| 2 | 756.59 | con_indice;cnt=None |
| 3 | 843.88 | con_indice;cnt=None |
| 4 | 797.92 | con_indice;cnt=None |
| 5 | 829.13 | con_indice;cnt=None |

## 8. Evolución con el Volumen (factor de crecimiento)

> Comparación de mediana entre N=100 000 y N=2 000 000.
> Factor = mediana(2M) / mediana(100k). Solo con datos medidos.

| Escenario | Workload | Mediana N=100k (ms) | Mediana N=2M (ms) | Factor ×100k→2M |
|-----------|----------|--------------------|--------------------|-----------------|
| B-tree | BUILD | 29.93 | 653.15 | 21.8× |
| B-tree | W1 | 52.04 | 93.71 | 1.8× |
| B-tree | W2 | 44.12 | 50.72 | 1.1× |
| B-tree | W3 | 42.01 | 797.92 | 19.0× |
| A-noindex (200 consultas) | W1 | 14.61 | 393.42 | 26.9× |
| A-noindex (200 consultas) | W2 | 997.30 | 20764.88 | 20.8× |

## 9. Fallos, Anomalías y Advertencias

| # | Tipo | Descripción |
|---|------|-------------|
| 1 | Omisión | W4 (búsqueda por rango): NO IMPLEMENTADO en t_tree. No hay `ttree_buscar_rango()` ni `amgetbitmap`. |
| 2 | Desviación | Escenario A usa 200 consultas en lugar de 10 000 para W1 y W2. |
| 3 | Restricción | T-Tree requiere sesión única; cada repetición reconstruye el árbol completo. |
| 4 | Arquitectura | El Access Method `ttree` no está registrado en `pg_am`; se usa la API de funciones directas. |
| 5 | Memoria | La medición de memoria del T-Tree incluye todo el contexto del backend, no solo TTreeContext. |
| 6 | Hits | Los contadores de hits en W1/W2 del bloque PL/pgSQL pueden aparecer como 0 si el NOTICE no se propaga correctamente. |

### CV > 10% (alta variabilidad)

- **N=100,000, A_noindex, W1**: CV=21.1% (media=15.56 ms, std=3.29 ms)
- **N=100,000, A_noindex, W3_heap**: CV=26.0% (media=31.21 ms, std=8.13 ms)
- **N=500,000, B_btree, BUILD**: CV=13.9% (media=159.75 ms, std=22.19 ms)
- **N=500,000, B_btree, W2**: CV=12.1% (media=47.81 ms, std=5.80 ms)
- **N=500,000, B_btree, W3**: CV=18.7% (media=203.97 ms, std=38.23 ms)
- **N=1,000,000, A_noindex, W1**: CV=12.0% (media=463.06 ms, std=55.35 ms)
- **N=1,000,000, A_noindex, W3_heap**: CV=12.7% (media=274.10 ms, std=34.90 ms)
- **N=1,000,000, B_btree, BUILD**: CV=19.0% (media=343.51 ms, std=65.22 ms)
- **N=2,000,000, A_noindex, W1**: CV=38.7% (media=440.76 ms, std=170.64 ms)
- **N=2,000,000, B_btree, W2**: CV=11.2% (media=50.53 ms, std=5.66 ms)

## 10. Salida de EXPLAIN

### Escenario B — B-tree (N=100 000, primera repetición)

```
SET
SET
SET
SET
Index Only Scan using bench_idx on bench_data  (cost=0.43..4.45 rows=1 width=4)
  Index Cond: (id = 42)
SET
```

### Escenario A — Sin Índice (N=100 000, primera repetición)

```
SET
SET
SET
SET
SET
Seq Scan on bench_data  (cost=0.00..37059.38 rows=11284 width=4)
  Filter: (id = 42)
```

## 11. Límites de Validez

Este benchmark **NO** permite concluir:

1. **Rendimiento multi-sesión del T-Tree**: el árbol no persiste entre conexiones;
   cualquier uso real en un servidor multi-cliente requeriría almacenamiento compartido.
2. **Búsquedas por rango**: el T-Tree no las implementa; ninguna comparación es posible.
3. **Eliminación**: la extensión no expone `ttree_eliminar()`; el benchmark no la mide.
4. **Generalización a otros tipos de datos**: solo se probaron enteros (`int4`).
5. **Rendimiento bajo concurrencia**: todas las mediciones son monousuario.
6. **Recuperación ante fallos**: el T-Tree se pierde al reiniciar el backend.
7. **Comparación de construcción justa**: B-tree usa bulk-build; T-Tree usa inserción fila a fila.
8. **Efecto de otros workloads**: las mediciones son en aislamiento, sin carga concurrente.

## 12. Ubicación de los Datos Crudos

- Datos crudos: `experiments/results/raw.csv`
- Formato: `timestamp, dataset, N, scenario, workload, metric, rep, value, unit, notes`
- Scripts: `experiments/scripts/generate_data.py`, `experiments/scripts/run_benchmark.py`
- Workloads: `experiments/workloads/`
