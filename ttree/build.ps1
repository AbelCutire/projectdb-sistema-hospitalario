# script hecho por gemini -> citar en la documentacion
#   .\build.ps1       es el script para compilar y ejecutar sin docker
#   .\build.ps1 clean    
param([string]$Target = "run")

$CC     = "gcc"
$SRC    = @("ttree.c", "main.c")
$OUT    = "ttree.exe"
$CFLAGS = @("-Wall", "-Wextra", "-g", "-std=c11")

function Clean {
    if (Test-Path $OUT) {
        Remove-Item $OUT
        Write-Host "[OK] $OUT eliminado." -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Nada que limpiar." -ForegroundColor Yellow
    }
}

function Build-And-Run {
    # Verificar gcc
    try {
        $v = & $CC --version 2>&1 | Select-Object -First 1
        Write-Host "[OK] $v" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] gcc no encontrado. Instala MinGW o MSYS2." -ForegroundColor Red
        exit 1
    }

    # Compilar
    $cmd = $CFLAGS + $SRC + @("-o", $OUT)
    Write-Host "Compilando: $CC $($cmd -join ' ')" -ForegroundColor Cyan
    & $CC @cmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Compilacion fallida." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Compilacion exitosa -> $OUT" -ForegroundColor Green

    Write-Host ""
    & ".\$OUT"
}

switch ($Target.ToLower()) {
    "clean" { Clean }
    default { Build-And-Run }
}
