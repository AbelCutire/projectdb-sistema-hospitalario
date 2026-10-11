# Sistema de Gestión Hospitalaria con Índice T-Tree

Sistema integral para la administración clínica, farmacéutica y operativa de centros de salud, que incorpora un motor de indexación nativo en C (**T-Tree**) integrado como extensión personalizada en **PostgreSQL 18** sobre infraestructura completamente contenedorizada con **Docker**.

---

## 🚀 Inicio Rápido con Docker (Un Solo Comando)

### Requisitos Previos
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con Docker Compose v2)
* Puertos disponibles en la máquina host: `5173` (Frontend), `3000` (Backend), `5432` (PostgreSQL)

---

### Iniciar Todo el Sistema

Ejecuta en la raíz del proyecto:

```bash
docker compose up --build
```

Este único comando automáticamente:
1. Compila e instala la extensión nativa de C **T-Tree** dentro de la imagen de PostgreSQL 18.
2. Inicia la base de datos PostgreSQL y habilita la extensión `t_tree`.
3. Aplica las migraciones del esquema y ejecuta los seeders con Prisma ORM.
4. Levanta el servidor API Backend en Node.js / Express con TypeScript.
5. Levanta la aplicación web Frontend en React / Vite.

---

### URLs y Puertos de Acceso

| Servicio | URL / Host | Puerto | Descripción |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | `5173` | Interfaz de usuario SPA (React 18 + Vite) |
| **Backend API** | [http://localhost:3000](http://localhost:3000) | `3000` | API REST (Express + TypeScript + Prisma) |
| **Health Check** | [http://localhost:3000/health](http://localhost:3000/health) | `3000` | Verificación de estado de la base de datos |
| **PostgreSQL 18** | `localhost:5432` | `5432` | Base de datos con extensión T-Tree |

*Credenciales por defecto de PostgreSQL:*
* **Usuario:** `postgres`
* **Contraseña:** `admin`
* **Base de datos:** `postgres`

---

### Detener el Sistema

Para detener todos los servicios:
```bash
docker compose down
```

Para detener y limpiar volúmenes de datos persistentes:
```bash
docker compose down -v
```

---

## 🧪 Pruebas y Verificación

### 1. Probar el Índice T-Tree en PostgreSQL
Puedes conectarte a la base de datos interactiva dentro del contenedor:

```bash
docker exec -it bd-parcial psql -U postgres -d postgres
```

Dentro de `psql`, puedes crear una tabla de prueba y verificar el uso del índice nativo `ttree`:

```sql
-- 1. Crear tabla con datos de prueba
CREATE TABLE prueba_t (id serial primary key, codigo int);
INSERT INTO prueba_t (codigo) SELECT (random() * 1000000)::int FROM generate_series(1, 100000);

-- 2. Crear el índice T-Tree nativo
CREATE INDEX idx_prueba_ttree ON prueba_t USING ttree (codigo);

-- 3. Verificar que PostgreSQL utiliza el índice en el plan de ejecución
EXPLAIN ANALYZE SELECT * FROM prueba_t WHERE codigo = 50000;

-- 4. Limpiar tabla de prueba
DROP TABLE prueba_t;
\q
```

---

### 2. Benchmark Rápido (Backend TypeScript)
Con los contenedores activos, corre la comparación automatizada entre escaneo secuencial e índice en base de datos:
```bash
docker compose exec backend npm run benchmark
```

---

### 3. Suite Formal de Experimentación (`experiments/`)

Para asegurar la validez metodológica y el rigor estadístico de los resultados presentados, el proyecto incluye una suite de experimentación automatizada. Esta herramienta evalúa el rendimiento algorítmico frente a diferentes cardinalidades de datos ($N = \{10^5, 5 \times 10^5, 10^6, 2 \times 10^6\}$ registros) contrastando tres arquitecturas de acceso:

1. **Sin Índice (Sequential Scan):** Actúa como línea base (*baseline*) algorítmica, demostrando la complejidad $\mathcal{O}(N)$ característica de un escaneo en bloque (heap scan) sobre la estructura de datos.
2. **PostgreSQL B-Tree:** La estructura de acceso secuencial estándar y altamente optimizada en disco de PostgreSQL. Representa el estándar de la industria ($\mathcal{O}(\log N)$).
3. **Estructura Propia T-Tree:** La implementación propuesta de árbol en memoria (en C puro). Concebida específicamente para maximizar la localidad de caché y reducir la latencia de acceso en entornos de memoria principal.

**Metodología de Cargas de Trabajo (Workloads):**
La ejecución se somete a tres paradigmas operacionales de acceso estandarizados:
* **W1 (Búsquedas Exitosas / *Hits*):** Evalúa los tiempos de latencia durante la recuperación de llaves existentes.
* **W2 (Búsquedas No Exitosas / *Misses*):** Someter a estrés la estructura mediante búsquedas exhaustivas que invariablemente recaen en condiciones de fallo (llaves inexistentes), forzando el recorrido de máxima profundidad.
* **W3 (Inserciones Dinámicas):** Cuantifica el *overhead* de mantenimiento del árbol y los ciclos de asignación de memoria durante operaciones DML masivas.

Para reproducir la batería científica completa:
```bash
# 1. Generar cargas de trabajo D2 y conjuntos vectorizados
python3 experiments/scripts/generate_data.py

# 2. Ejecutar el orquestador de benchmark
python3 experiments/scripts/run_benchmark.py
```
*El informe técnico consolidado (incluyendo tablas comparativas en formato Markdown) se genera de manera determinística en `experiments/results/BENCHMARK_RESULTADOS.md`.*
