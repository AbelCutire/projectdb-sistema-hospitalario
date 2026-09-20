# build.ps1 - Script de compilación y prueba del T-Tree para Windows (PowerShell)
# Proyecto Académico: Bases de Datos II
#
# Uso:
#   .\build.ps1          -> compilar y ejecutar pruebas
#   .\build.ps1 clean    -> limpiar archivos generados
#   .\build.ps1 debug    -> compilar con simbolos de debug
#
# Requiere: gcc (MinGW/MSYS2) en el PATH

param(
    [string]$Target = "test"
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------
$CC        = "gcc"
$SRC       = "src\ttree.c"
$TEST_SRC  = "tests\test_ttree.c"
$BUILD_DIR = "build"
$TARGET    = "$BUILD_DIR\test_ttree.exe"

$CFLAGS = @(
    "-std=c11",
    "-Wall",
    "-Wextra",
    "-Wpedantic",
    "-Werror",
    "-I.\src"
)

$CFLAGS_DEBUG = $CFLAGS + @(
    "-g3", "-O0", "-DDEBUG"
)

$CFLAGS_RELEASE = $CFLAGS + @("-O2")

# ---------------------------------------------------------------------------
# Funciones
# ---------------------------------------------------------------------------

function Ensure-BuildDir {
    if (-not (Test-Path $BUILD_DIR)) {
        New-Item -ItemType Directory -Path $BUILD_DIR | Out-Null
        Write-Host "[OK] Directorio '$BUILD_DIR' creado." -ForegroundColor Green
    }
}

function Clean {
    if (Test-Path $BUILD_DIR) {
        Remove-Item -Recurse -Force $BUILD_DIR
        Write-Host "[OK] Directorio '$BUILD_DIR' eliminado." -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Nada que limpiar." -ForegroundColor Yellow
    }
}

function Build-Test([string[]]$ExtraFlags) {
    Ensure-BuildDir

    $AllFlags = $ExtraFlags + @($SRC, $TEST_SRC, "-o", $TARGET, "-lm")

    Write-Host ""
    Write-Host "Compilando: $CC $($AllFlags -join ' ')" -ForegroundColor Cyan

    & $CC @AllFlags

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Compilacion fallida con codigo $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "[OK] Compilacion exitosa -> $TARGET" -ForegroundColor Green
}

function Run-Tests {
    if (-not (Test-Path $TARGET)) {
        Write-Host "[ERROR] Ejecutable no encontrado: $TARGET" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "------------------------------------------------------------" -ForegroundColor White
    Write-Host "  Ejecutando suite de pruebas del T-Tree" -ForegroundColor White
    Write-Host "------------------------------------------------------------" -ForegroundColor White
    Write-Host ""

    & ".\$TARGET"
    $ExitCode = $LASTEXITCODE

    Write-Host ""
    if ($ExitCode -eq 0) {
        Write-Host "=============================" -ForegroundColor Green
        Write-Host "  TODAS LAS PRUEBAS: PASS" -ForegroundColor Green
        Write-Host "=============================" -ForegroundColor Green
    } else {
        Write-Host "=============================" -ForegroundColor Red
        Write-Host "  PRUEBAS FALLIDAS (codigo $ExitCode)" -ForegroundColor Red
        Write-Host "=============================" -ForegroundColor Red
    }

    exit $ExitCode
}

# ---------------------------------------------------------------------------
# Verificar gcc
# ---------------------------------------------------------------------------
Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "  T-Tree - Script de compilacion (Windows/PowerShell)" -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Magenta

try {
    $GccVersion = & $CC --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] $GccVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] gcc no encontrado. Instalar MinGW o MSYS2." -ForegroundColor Red
    Write-Host "        Descarga: https://www.msys2.org/" -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# Ejecutar target
# ---------------------------------------------------------------------------
switch ($Target.ToLower()) {
    "clean" {
        Clean
    }
    "debug" {
        Build-Test $CFLAGS_DEBUG
        Run-Tests
    }
    "build" {
        Build-Test $CFLAGS_RELEASE
        Write-Host "[OK] Solo compilacion completada." -ForegroundColor Green
    }
    default {
        # "test" o cualquier otro valor
        Build-Test $CFLAGS_RELEASE
        Run-Tests
    }
}
