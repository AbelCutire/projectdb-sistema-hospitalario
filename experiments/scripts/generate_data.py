#!/usr/bin/env python3
"""
generate_data.py — Generador de datasets y cargas de trabajo para el benchmark T-Tree.

Genera archivos CSV deterministas (semilla=42) que son idénticos para los tres
escenarios (sin índice, B-tree, T-Tree), garantizando comparabilidad.

Uso:
    python3 experiments/scripts/generate_data.py

Salida (en experiments/workloads/):
    data_D2_N<n>.csv          — N enteros aleatorios únicos en [1, 10·N]
    w1_hits_N<n>.csv          — 10 000 claves existentes (búsquedas exitosas)
    w2_misses_N<n>.csv        — 10 000 claves ausentes (búsquedas no exitosas)
    w3_inserts_N<n>.csv       — 0.1·N claves nuevas únicas (inserciones)
    w1_hits_small_N<n>.csv    — 200 claves (submuestra para escenario sin índice)
    w2_misses_small_N<n>.csv  — 200 claves (submuestra para escenario sin índice)

NOTA: El escenario sin índice usa sólo 200 consultas de W1 y W2 porque realizar
10 000 recorridos secuenciales sobre 2 000 000 de filas es inviable en tiempo.
"""

import csv
import os
import random
import sys
import time

SEED = 42
SIZES = [100_000, 500_000, 1_000_000, 2_000_000]
W1_W2_SIZE = 10_000
W3_FRACTION = 0.1
SMALL_SEQSCAN_SIZE = 200          # submuestra para escenario sin índice
WORKLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "workloads")


def generate_dataset_d2(n: int, rng: random.Random) -> list[int]:
    """Genera N enteros aleatorios únicos en [1, 10·N] con semilla fija."""
    key_space = list(range(1, 10 * n + 1))
    return sorted(rng.sample(key_space, n))


def save_csv_single_column(path: str, values: list, header: str = "key") -> None:
    """Guarda una lista de valores en un CSV de una columna."""
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([header])
        for v in values:
            writer.writerow([v])


def main() -> None:
    os.makedirs(WORKLOAD_DIR, exist_ok=True)
    print(f"[generate_data.py] Semilla SEED={SEED}, tamaños={SIZES}")
    print(f"[generate_data.py] Salida en: {os.path.abspath(WORKLOAD_DIR)}\n")

    for n in SIZES:
        t0 = time.time()
        rng = random.Random(SEED)   # semilla fresca para cada N

        print(f"  N={n:>9,} — generando D2 ...", end="", flush=True)
        data = generate_dataset_d2(n, rng)
        data_set = set(data)

        path_d2 = os.path.join(WORKLOAD_DIR, f"data_D2_N{n}.csv")
        save_csv_single_column(path_d2, data, header="id")
        print(f" OK ({len(data):,} filas)", flush=True)

        # ── W1: 10 000 claves existentes (muestreadas con misma semilla derivada) ──
        rng_w = random.Random(SEED + 1)
        w1_keys = sorted(rng_w.sample(data, min(W1_W2_SIZE, n)))
        path_w1 = os.path.join(WORKLOAD_DIR, f"w1_hits_N{n}.csv")
        save_csv_single_column(path_w1, w1_keys, header="key")

        # Submuestra para escenario sin índice (primeras 200)
        path_w1_small = os.path.join(WORKLOAD_DIR, f"w1_hits_small_N{n}.csv")
        save_csv_single_column(path_w1_small, w1_keys[:SMALL_SEQSCAN_SIZE], header="key")

        # ── W2: 10 000 claves ausentes ──────────────────────────────────────────
        # Claves en [10·N+1, 20·N] garantizan ausencia
        rng_w2 = random.Random(SEED + 2)
        candidate_misses = list(range(10 * n + 1, 20 * n + 1))
        w2_keys = sorted(rng_w2.sample(candidate_misses, W1_W2_SIZE))
        path_w2 = os.path.join(WORKLOAD_DIR, f"w2_misses_N{n}.csv")
        save_csv_single_column(path_w2, w2_keys, header="key")

        path_w2_small = os.path.join(WORKLOAD_DIR, f"w2_misses_small_N{n}.csv")
        save_csv_single_column(path_w2_small, w2_keys[:SMALL_SEQSCAN_SIZE], header="key")

        # ── W3: inserciones (10% de N) — claves nuevas únicas ───────────────────
        w3_size = max(1, int(n * W3_FRACTION))
        # Usamos claves en [20·N+1, 30·N] — nunca presentes en D2 ni en W2
        rng_w3 = random.Random(SEED + 3)
        candidate_inserts = list(range(20 * n + 1, 30 * n + 1))
        w3_keys = sorted(rng_w3.sample(candidate_inserts, w3_size))
        path_w3 = os.path.join(WORKLOAD_DIR, f"w3_inserts_N{n}.csv")
        save_csv_single_column(path_w3, w3_keys, header="key")

        elapsed = time.time() - t0
        print(f"         W1={len(w1_keys):,}  W2={len(w2_keys):,}  W3={len(w3_keys):,}  [{elapsed:.1f}s]")

    print("\n[generate_data.py] ¡Listo! Todos los archivos generados.")


if __name__ == "__main__":
    main()
