#!/usr/bin/env bash
# scripts/build_and_test.sh
# Script de construcción y prueba del T-Tree
# Uso: bash scripts/build_and_test.sh [--debug]
#
# Proyecto Académico: Bases de Datos II
#
# Este script:
#   1. Verifica que gcc esté disponible
#   2. Compila el núcleo del T-Tree
#   3. Compila y ejecuta las pruebas
#   4. Opcionalmente ejecuta con AddressSanitizer
#   5. Muestra un resumen final

set -e  # salir en el primer error

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TTREE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$TTREE_ROOT"

echo "============================================================"
echo "  T-Tree — Script de construcción y prueba"
echo "  Directorio: $TTREE_ROOT"
echo "============================================================"

# ---------------------------------------------------------------
# Verificar herramientas
# ---------------------------------------------------------------
if ! command -v gcc &>/dev/null; then
    echo "ERROR: gcc no encontrado. Instalar build-essential."
    exit 1
fi
echo "[OK] gcc: $(gcc --version | head -1)"

# ---------------------------------------------------------------
# Compilación estándar
# ---------------------------------------------------------------
echo ""
echo "--- Compilando (release)..."
make clean 2>/dev/null || true
make

echo ""
echo "--- Ejecutando pruebas (release)..."
make test

# ---------------------------------------------------------------
# Compilación debug con sanitizers (si se pide)
# ---------------------------------------------------------------
if [[ "$1" == "--debug" ]]; then
    echo ""
    echo "--- Compilando (debug + AddressSanitizer + UBSan)..."
    make debug

    echo ""
    echo "--- Ejecutando con sanitizers..."
    ASAN_OPTIONS=detect_leaks=1 ./build/test_ttree_debug
fi

echo ""
echo "============================================================"
echo "  ¡Compilación y pruebas completadas exitosamente!"
echo "============================================================"
