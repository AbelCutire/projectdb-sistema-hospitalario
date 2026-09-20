# ===========================================================================
# Makefile — T-Tree Index Structure
# Proyecto Académico: Bases de Datos II
# ===========================================================================
#
# Uso:
#   make           → compilar el núcleo del T-Tree
#   make test      → compilar y ejecutar las pruebas
#   make debug     → compilar con símbolos de depuración y sanitizers
#   make clean     → eliminar archivos generados
#   make pg-extension → compilar la extensión de PostgreSQL (requiere PG dev)
#
# Requiere: gcc (Linux/macOS) o cl.exe (Windows — ver nota abajo)
#
# NOTA WINDOWS:
#   En Windows sin WSL, usar Docker (ver Dockerfile) o MinGW-w64.
#   El Makefile está escrito para gcc en Linux/macOS/WSL.

# ---------------------------------------------------------------------------
# COMPILADOR Y FLAGS
# ---------------------------------------------------------------------------

CC      = gcc

# Flags estrictos — sin excepciones
CFLAGS  = -std=c11 \
           -Wall \
           -Wextra \
           -Wpedantic \
           -Werror \
           -I./src

# Flags de optimización para release
CFLAGS_RELEASE = $(CFLAGS) -O2

# Flags de depuración + sanitizers
CFLAGS_DEBUG = $(CFLAGS) \
               -g3 \
               -O0 \
               -fsanitize=address,undefined \
               -fno-omit-frame-pointer \
               -DDEBUG

# Flag para la extensión PostgreSQL (desactiva -Werror por código PG)
CFLAGS_PG = -std=c11 -Wall -Wextra -O2 -DBUILDING_TTREE_PG

# ---------------------------------------------------------------------------
# DIRECTORIOS Y ARCHIVOS
# ---------------------------------------------------------------------------

SRC_DIR   = src
TEST_DIR  = tests
PG_DIR    = postgres
BUILD_DIR = build

SRC_FILES  = $(SRC_DIR)/ttree.c
TEST_FILES = $(TEST_DIR)/test_ttree.c

TARGET_LIB  = $(BUILD_DIR)/ttree.o
TARGET_TEST = $(BUILD_DIR)/test_ttree

# ---------------------------------------------------------------------------
# TARGETS PRINCIPALES
# ---------------------------------------------------------------------------

.PHONY: all test debug clean pg-extension help

## all — Compilar el núcleo del T-Tree (objeto .o)
all: $(BUILD_DIR) $(TARGET_LIB)
	@echo "✓ Núcleo del T-Tree compilado en $(TARGET_LIB)"

## test — Compilar y ejecutar la suite de pruebas
test: $(BUILD_DIR) $(TARGET_TEST)
	@echo "------------------------------------------------------------"
	@echo "  Ejecutando suite de pruebas del T-Tree"
	@echo "------------------------------------------------------------"
	./$(TARGET_TEST)

## debug — Compilar con AddressSanitizer y UBSan para detección de errores
debug: $(BUILD_DIR)
	$(CC) $(CFLAGS_DEBUG) \
		$(SRC_FILES) $(TEST_FILES) \
		-o $(BUILD_DIR)/test_ttree_debug \
		-lm
	@echo "✓ Build de debug listo: $(BUILD_DIR)/test_ttree_debug"
	@echo "  Ejecutar con:"
	@echo "    ASAN_OPTIONS=detect_leaks=1 ./$(BUILD_DIR)/test_ttree_debug"

## clean — Eliminar todos los archivos generados
clean:
	rm -rf $(BUILD_DIR)
	@echo "✓ Directorio $(BUILD_DIR) eliminado"

## help — Mostrar esta ayuda
help:
	@echo "T-Tree Makefile — Comandos disponibles:"
	@echo "  make           → compilar el núcleo"
	@echo "  make test      → ejecutar pruebas"
	@echo "  make debug     → compilar con sanitizers"
	@echo "  make clean     → limpiar archivos generados"
	@echo "  make pg-extension → compilar extensión PostgreSQL"

# ---------------------------------------------------------------------------
# REGLAS DE COMPILACIÓN
# ---------------------------------------------------------------------------

## Crear directorio de build si no existe
$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

## Compilar el objeto del núcleo T-Tree
$(TARGET_LIB): $(SRC_FILES) $(SRC_DIR)/ttree.h
	$(CC) $(CFLAGS_RELEASE) -c $(SRC_FILES) -o $(TARGET_LIB)

## Compilar el ejecutable de pruebas (núcleo + tests en un solo binario)
$(TARGET_TEST): $(SRC_FILES) $(TEST_FILES) $(SRC_DIR)/ttree.h
	$(CC) $(CFLAGS_RELEASE) \
		$(SRC_FILES) $(TEST_FILES) \
		-o $(TARGET_TEST) \
		-lm
	@echo "✓ Ejecutable de pruebas: $(TARGET_TEST)"

# ---------------------------------------------------------------------------
# EXTENSIÓN DE POSTGRESQL
# ---------------------------------------------------------------------------

## pg-extension — Compilar ttree_am.so para PostgreSQL
##
## Requiere:
##   - PostgreSQL 18 instalado con cabeceras de desarrollo
##   - En Ubuntu/Debian: apt-get install postgresql-server-dev-18
##   - En Docker: usar el Dockerfile incluido
##
## La variable PG_CONFIG apunta al binario pg_config de PostgreSQL 18.
## Sobreescribir si está en una ruta no estándar:
##   make pg-extension PG_CONFIG=/usr/lib/postgresql/18/bin/pg_config

PG_CONFIG ?= pg_config

pg-extension:
	@echo "------------------------------------------------------------"
	@echo "  Compilando extensión PostgreSQL T-Tree"
	@echo "  PG_CONFIG = $(PG_CONFIG)"
	@echo "------------------------------------------------------------"
	@command -v $(PG_CONFIG) >/dev/null 2>&1 || \
		{ echo "ERROR: $(PG_CONFIG) no encontrado."; \
		  echo "Instalar: apt-get install postgresql-server-dev-18"; \
		  exit 1; }

	$(CC) $(CFLAGS_PG) \
		-fPIC \
		-I$(shell $(PG_CONFIG) --includedir-server) \
		-I./src \
		-shared \
		$(PG_DIR)/ttree_am.c \
		$(SRC_DIR)/ttree.c \
		-o $(BUILD_DIR)/ttree_am.so

	@echo "✓ Extensión compilada: $(BUILD_DIR)/ttree_am.so"
	@echo ""
	@echo "Para instalar:"
	@echo "  1. sudo cp $(BUILD_DIR)/ttree_am.so \$$($(PG_CONFIG) --pkglibdir)/"
	@echo "  2. sudo cp $(PG_DIR)/ttree.control \$$($(PG_CONFIG) --sharedir)/extension/"
	@echo "  3. sudo cp '$(PG_DIR)/ttree--1.0.sql' \$$($(PG_CONFIG) --sharedir)/extension/"
	@echo "  4. En psql: CREATE EXTENSION ttree;"
