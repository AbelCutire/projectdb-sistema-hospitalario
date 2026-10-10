# Sistema de Gestión Hospitalaria con Índice T-Tree

Sistema integral para la administración clínica, farmacéutica y operativa de centros de salud, que incorpora un motor de indexación nativo en C (**T-Tree**) integrado como extensión personalizada en **PostgreSQL 18** sobre infraestructura completamente contenedorizada con **Docker**.

---

## 🚀 Inicio Rápido con Docker (Un Solo Comando)

### Requisitos Previos
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con Docker Compose v2)
* Puertos disponibles en tu máquina host: `5173` (Frontend), `3000` (Backend), `5432` (PostgreSQL)

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
| **PostgreSQL 18** | `localhost:5432` | `5432` | Base de datos con extensión T-Tree |

*Credenciales por defecto de la base de datos:*
* **Usuario:** `postgres`
* **Contraseña:** `admin`
* **Base de datos:** `postgres`

---

### Detener el Sistema

Para detener todos los servicios:
```bash
docker compose down
```

Para detener y limpiar volúmenes de datos:
```bash
docker compose down -v
```

---

## 🌳 Extensión T-Tree en PostgreSQL

El proyecto incluye una extensión nativa en C ubicada en `backend/extension/` que implementa un **T-Tree** en memoria (balanceo AVL con nodos multi-clave).

### Funciones SQL Disponibles
```sql
-- Limpiar el árbol global en memoria
SELECT ttree_limpiar();

-- Insertar una clave entera
SELECT ttree_insertar(10500);

-- Buscar una clave
SELECT ttree_buscar(10500);
```

---

## 📊 Benchmarks y Experimentación

### 1. Validación rápida (Backend TypeScript)
Con los contenedores activos:
```bash
docker compose exec backend npm run benchmark
```

### 2. Suite Formal de Experimentación (`experiments/`)
Para reproducir la batería científica completa (Seq-Scan vs B-Tree vs T-Tree hasta 2M de registros):
```bash
# 1. Generar cargas de trabajo D2
python3 experiments/scripts/generate_data.py

# 2. Ejecutar la suite de benchmark
python3 experiments/scripts/run_benchmark.py
```
*El informe completo con los resultados numéricos se encuentra en [`experiments/results/BENCHMARK_RESULTADOS.md`](file:///home/gillard/Proyectos/projectdb-sistema-hospitalario/experiments/results/BENCHMARK_RESULTADOS.md).*
