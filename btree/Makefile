# ===========================================================================
# Makefile — B-Tree Index Structure (Analogue to T-Tree)
# Proyecto Académico: Bases de Datos II
# ===========================================================================

CC      = gcc
CFLAGS  = -std=c11 -Wall -Wextra -Wpedantic -Werror -I./src
CFLAGS_RELEASE = $(CFLAGS) -O2

SRC_DIR   = src
TEST_DIR  = tests
BUILD_DIR = build

SRC_FILES  = $(SRC_DIR)/btree.c
TEST_FILES = $(TEST_DIR)/test_btree.c

TARGET_LIB  = $(BUILD_DIR)/btree.o
TARGET_TEST = $(BUILD_DIR)/test_btree

.PHONY: all test clean help

all: $(BUILD_DIR) $(TARGET_LIB)
	@echo "✓ Núcleo del B-Tree compilado en $(TARGET_LIB)"

test: $(BUILD_DIR) $(TARGET_TEST)
	@echo "------------------------------------------------------------"
	@echo "  Ejecutando suite de pruebas del B-Tree"
	@echo "------------------------------------------------------------"
	./$(TARGET_TEST)

clean:
	rm -rf $(BUILD_DIR)
	@echo "✓ Directorio $(BUILD_DIR) eliminado"

help:
	@echo "B-Tree Makefile — Comandos disponibles:"
	@echo "  make           → compilar el núcleo"
	@echo "  make test      → ejecutar pruebas"
	@echo "  make clean     → limpiar archivos generados"

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(TARGET_LIB): $(SRC_FILES) $(SRC_DIR)/btree.h
	$(CC) $(CFLAGS_RELEASE) -c $(SRC_FILES) -o $(TARGET_LIB)

$(TARGET_TEST): $(SRC_FILES) $(TEST_FILES) $(SRC_DIR)/btree.h
	$(CC) $(CFLAGS_RELEASE) $(SRC_FILES) $(TEST_FILES) -o $(TARGET_TEST) -lm
	@echo "✓ Ejecutable de pruebas B-Tree: $(TARGET_TEST)"
