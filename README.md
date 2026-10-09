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
```

## Tecnologías Utilizadas

* **Frontend:** React, Vite, Tailwind CSS / Vanilla CSS, Axios, Lucide Icons.
* **Backend:** Node.js, Express, TypeScript, Prisma ORM, JWT, Bcrypt.
* **Base de Datos:** PostgreSQL 16 (desplegado vía Docker con volúmenes persistentes).
* **Estructuras de Datos:** C (estándar C99/C11), Makefile, scripts de compilación cruzada.

---

## Requisitos Previos

* [Node.js](https://nodejs.org/) (versión 18.x o superior)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con WSL 2 habilitado en Windows)
* Compilador GCC / MinGW (si se van a compilar y ejecutar los módulos nativos de C)

---

## Guía de Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone [https://github.com/abelcutire/projectdb-sistema-hospitalario.git](https://github.com/abelcutire/projectdb-sistema-hospitalario.git)
cd projectdb-sistema-hospitalario
```
---

### 2. Base de Datos (Docker)

Levanta el contenedor de PostgreSQL con las extensiones personalizadas:

```bash
docker compose up -d --build

```

*El servicio quedará escuchando en `localhost:5432` con usuario `postgres` y contraseña `admin`.*

---

### 3. Configurar y Levantar el Backend

Entra a la carpeta del backend e instala dependencias:

```bash
cd backend
npm install

```

Crea o edita el archivo `.env` en `backend/.env`:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:admin@localhost:5432/postgres?schema=public"
JWT_SECRET="tu_clave_secreta_jwt"
# Opcional (para envío de correos de verificación reales):
# BREVO_API_KEY="xkeysib-..."
# EMAIL_FROM="no-reply@hospital.edu.pe"

```

Sincroniza el esquema con PostgreSQL y levanta el servidor en modo desarrollo:

```bash
npx prisma db push
npx prisma generate
npm run dev

```

*El backend iniciará en `http://localhost:3000`.*

---

### 4. Levantar el Frontend

En una nueva terminal, navega a la carpeta `frontend`:

```bash
cd frontend
npm install
npm run dev

```

*La interfaz estará disponible en el navegador en `http://localhost:5173`.*

---

## Compilación y Pruebas del Módulo Nativo en C

Para ejecutar las pruebas del T-Tree o correr el benchmark de estructuras:

### T-Tree

```bash
cd ttree

# En Linux/macOS:
gcc -Wall -Wextra main.c ttree.c -o ttree_test
./ttree_test

# En Windows (PowerShell con MinGW o script dedicado):
.\build.ps1

```

### Benchmark de Rendimiento

```bash
cd benchmark
make
./run_benchmark

```

---

## Endpoints Principales de la API

| Método | Endpoint | Descripción | Rol Mínimo |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Autenticación y retorno de JWT | Público |
| `POST` | `/api/auth/register-patient` | Solicitud de registro con OTP | Público |
| `GET` | `/api/citas` | Listado general de citas | Personal Médico / Admin |
| `POST` | `/api/citas` | Creación y agendamiento de cita | Paciente / Admin |
| `GET` | `/api/pacientes` | Consulta de historias y datos de pacientes | Personal Clínico |
| `GET` | `/api/farmacia/medicamentos` | Inventario y disponibilidad de fármacos | Personal / Farmacia |
| `GET` | `/api/hospitalizacion/camillas` | Estado en tiempo real de camas hospitalarias | Médico / Enfermería |
| `GET` | `/api/auditoria` | Registros de trazabilidad del sistema | Administrador |