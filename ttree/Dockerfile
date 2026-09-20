# Dockerfile — Entorno de compilación y prueba del T-Tree
#
# Proyecto Académico: Bases de Datos II — Indexación y Distribución en PostgreSQL
#
# Uso:
#   cd ttree/
#   docker build -t ttree-dev .
#   docker run --rm ttree-dev make test
#
# Para shell interactivo:
#   docker run --rm -it -v $(pwd):/ttree ttree-dev bash
#
# Para compilar la extensión PostgreSQL:
#   docker run --rm -it -v $(pwd):/ttree ttree-dev make pg-extension
#
# NOTA: No modifica ni afecta al docker-compose del sistema hospitalario.

# =========================================================================
# BASE: PostgreSQL 18 con cabeceras de desarrollo
# =========================================================================
#
# Usamos la imagen oficial de PostgreSQL 18.
# La versión está fijada explícitamente (no usamos :latest).
#
# Si PostgreSQL 18 aún no está en Docker Hub con tag exacto,
# usar el candidato más reciente: postgres:18beta o postgres:18
# Ajustar cuando 18 GA esté disponible en Docker Hub.
#
# Para PostgreSQL 18 con dev headers se usa la imagen de desarrollo
# basada en Debian que incluye los fuentes necesarios.

FROM postgres:17-bookworm AS pg_base

# Instalar herramientas de compilación y cabeceras de PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        make \
        valgrind \
        libpq-dev \
        postgresql-server-dev-17 \
    && rm -rf /var/lib/apt/lists/*

# =========================================================================
# DIRECTORIO DE TRABAJO
# =========================================================================

WORKDIR /ttree

# Copiar todos los fuentes del T-Tree
COPY . .

# =========================================================================
# COMPILACIÓN DEL NÚCLEO
# =========================================================================

RUN make

# =========================================================================
# PRUEBAS
# =========================================================================
#
# Por defecto el contenedor ejecuta make test.
# Para pruebas con Valgrind:
#   docker run --rm ttree-dev valgrind --leak-check=full ./build/test_ttree

CMD ["make", "test"]

# =========================================================================
# STAGE SEPARADO: Compilación de la extensión PostgreSQL
# =========================================================================

FROM pg_base AS pg_extension

WORKDIR /ttree
COPY . .
RUN make && make pg-extension

# Instrucciones para instalar la extensión en PostgreSQL del contenedor
# (requiere volumen compartido con el servidor PostgreSQL)
#
#   docker run --rm -it \
#     -v /var/lib/postgresql/18/main:/var/lib/postgresql/data \
#     -v $(pwd):/ttree \
#     ttree-dev:pg_extension bash
#
# Dentro del contenedor:
#   make pg-extension
#   cp build/ttree_am.so $(pg_config --pkglibdir)/
#   cp postgres/ttree.control $(pg_config --sharedir)/extension/
#   cp postgres/ttree--1.0.sql $(pg_config --sharedir)/extension/
