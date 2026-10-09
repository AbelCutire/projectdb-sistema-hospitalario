# Sistema de Gestión Hospitalaria (EsSalud Premium Ultra Pro Max+)

Plataforma integral para la administración clínica, farmacéutica y operativa de centros de salud. El sistema combina una arquitectura web moderna (React + Node.js/TypeScript + PostgreSQL con Prisma ORM) con implementaciones nativas en C de estructuras de datos avanzadas (**T-Tree** y **B-Tree**) para experimentación, benchmarking y optimización de índices en bases de datos orientadas a memoria (MMDB).

---

## Características Principales

### 1. Gestión Clínica y Operativa
* **Control de Citas Médicas:** Programación, asignación de turnos, gestión de estados de consulta y vinculación con consultorios.
* **Historial Clínico y Diagnósticos:** Registro centralizado de diagnósticos, emisión de recetas médicas y seguimiento de tratamientos.
* **Farmacia e Inventario:** Control de catálogo farmacéutico (monodrogas, presentaciones, acciones terapéuticas) y supervisión de stock por almacén.
* **Hospitalización:** Administración de salas, disponibilidad de camillas en tiempo real, ingresos y altas médicas.
* **Gestión de Personal y Pacientes:** Mapeo de roles para personal administrativo, doctores, enfermeras, técnicos y pacientes con control de datos personales (DNI, contacto).

### 2. Seguridad y Auditoría
* **Autenticación y Autorización:** Control de acceso basado en roles (RBAC) con tokens JWT y verificación en dos pasos (OTP por correo vía Brevo).
* **Módulo de Auditoría:** Registro transaccional de operaciones críticas para trazabilidad de cambios en base de datos.

### 3. Motor de Indexación Nativo en C (Benchmarking MMDB)
* **T-Tree (`/ttree`):** Estructura de indexación en memoria diseñada para bases de datos principales (Main Memory Databases), balanceada mediante rotaciones tipo AVL pero con nodos multi-clave.
* **B-Tree (`/btree`):** Implementación de referencia orientada a bloques de disco para comparar costo computacional, fragmentación y tiempos de búsqueda.
* **Módulo de Benchmark (`/benchmark`):** Rutinas en C para medir throughput de inserción, búsqueda puntual y recorridos por rango entre ambas estructuras.

---

## Arquitectura del Proyecto

```text
projectdb-sistema-hospitalario/
├── backend/                  # Servidor de API REST (Node.js + Express + TypeScript)
│   ├── prisma/               # Esquema de base de datos (schema.prisma) y migraciones
│   ├── src/
│   │   ├── controllers/      # Lógica de negocio (citas, pacientes, farmacia, etc.)
│   │   ├── middlewares/      # Seguridad, validación de JWT y roles
│   │   ├── routes/           # Enrutamiento modular de la API
│   │   └── utils/            # Servicios de correo (mailer), auditoría y seeders
│   └── fix_*.ts              # Scripts de corrección y mantenimiento de secuencias
│
├── frontend/                 # Interfaz de usuario SPA (React 18 + Vite)
│   ├── src/
│   │   ├── components/       # Modales de acción, formularios y rutas protegidas
│   │   ├── views/            # Vistas principales (Dashboard, Clínico, Farmacia, etc.)
│   │   └── services/         # Cliente Axios configurado para consumo de la API
│   └── vite.config.js
│
├── database/                 # Scripts DDL y consultas analíticas en PostgreSQL
│   ├── schema/               # Definición modular de tablas (personas, citas, farmacia)
│   ├── queries/              # Consultas complejas de reportes y analítica clínica
│   └── insert/               # Poblado de datos iniciales para pruebas
│
├── ttree/                    # Implementación en C de estructura T-Tree
│   ├── ttree.c / ttree.h     # Primitivas de inserción, balanceo y búsqueda
│   └── DOCUMENTACION.md      # Análisis teórico y complejidad algorítmica
│
├── btree/                    # Implementación en C de estructura B-Tree
│   └── src/                  # Código fuente del árbol y pruebas unitarias
│
├── benchmark/                # Pruebas comparativas de rendimiento en C
├── Docker/                   # Entorno de contenedorización y extensiones C
└── docker-compose.yml        # Orquestación del servicio PostgreSQL local