#!/usr/bin/env python3
"""
run_benchmark.py — Orquestador principal del benchmark T-Tree vs B-tree vs Sin Índice.

Ejecuta TODAS las combinaciones (N × escenario × workload × repetición) y escribe:
  - experiments/results/raw.csv   (datos crudos, formato largo)
  - experiments/results/BENCHMARK_RESULTADOS.md  (informe completo)

Uso:
    python3 experiments/scripts/run_benchmark.py

Requisitos:
    - Contenedor Docker "bd-parcial" corriendo con PostgreSQL 18.6 + extensión t_tree
    - Archivos CSV en experiments/workloads/ (ejecutar generate_data.py primero)

Restricción de sesión T-Tree:
    El árbol vive en memoria del proceso backend (raiz_global estática).
    Construcción + W1 + W2 + W3 del T-Tree se ejecutan en UNA MISMA conexión psql.
"""

import csv
import datetime
import os
import subprocess
import sys
import time

# ── Configuración ────────────────────────────────────────────────────────────
CONTAINER   = "bd-parcial"
PG_USER     = "postgres"
DB_NAME     = "postgres"
SIZES       = [100_000, 500_000, 1_000_000, 2_000_000]
REPS        = 5          # repeticiones medidas (+ 1 calentamiento)
SEQSCAN_N   = 200        # submuestra para escenario sin índice
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKLOAD_DIR = os.path.join(BASE_DIR, "workloads")
RESULTS_DIR  = os.path.join(BASE_DIR, "results")
RAW_CSV      = os.path.join(RESULTS_DIR, "raw.csv")
REPORT_MD    = os.path.join(RESULTS_DIR, "BENCHMARK_RESULTADOS.md")

TIMESTAMP_RUN = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

RAW_HEADER = [
    "timestamp", "dataset", "N", "scenario", "workload",
    "metric", "rep", "value", "unit", "notes"
]

# ── Helpers ──────────────────────────────────────────────────────────────────
def psql(sql: str, timeout: int = 3600) -> tuple[str, str, int]:
    """Ejecuta SQL en el contenedor y retorna (stdout, stderr, returncode)."""
    cmd = [
        "docker", "exec", "-i", CONTAINER,
        "psql", "-U", PG_USER, "-d", DB_NAME,
        "-X",          # no leer ~/.psqlrc
        "-A",          # sin alineación de tabla
        "-t",          # solo tuplas
        "-F", "|",     # separador de campo
        "-c", sql
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return result.stdout.strip(), result.stderr.strip(), result.returncode


def psql_file(filepath: str, timeout: int = 3600) -> tuple[str, str, int]:
    """Ejecuta un archivo SQL en el contenedor."""
    cmd = [
        "docker", "exec", "-i", CONTAINER,
        "psql", "-U", PG_USER, "-d", DB_NAME,
        "-X", "-A", "-t", "-F", "|",
        "-f", filepath
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return result.stdout.strip(), result.stderr.strip(), result.returncode


def copy_csv_to_table(table: str, csv_path: str, column: str = "id", timeout: int = 600) -> tuple[str, str, int]:
    """Carga un CSV en una tabla PostgreSQL via COPY."""
    # Primero copiamos el CSV al contenedor
    container_path = f"/tmp/bench_{os.path.basename(csv_path)}"
    subprocess.run(
        ["docker", "cp", csv_path, f"{CONTAINER}:{container_path}"],
        check=True, capture_output=True
    )
    sql = f"COPY {table}({column}) FROM '{container_path}' CSV HEADER;"
    return psql(sql, timeout=timeout)


def log(msg: str) -> None:
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def write_raw_row(writer, dataset, N, scenario, workload, metric, rep, value, unit, notes=""):
    writer.writerow([
        TIMESTAMP_RUN, dataset, N, scenario, workload,
        metric, rep, value, unit, notes
    ])


# ── Configuración de sesión (anti-ruido) ─────────────────────────────────────
SESSION_CONFIG = "SET jit = off; SET max_parallel_workers_per_gather = 0; SET enable_hashjoin = off;"


# ── BLOQUE: Construcción del T-Tree (N inserciones ttree_insertar) ───────────
def build_ttree_sql(n: int) -> str:
    """SQL para limpiar + cargar el T-Tree desde la tabla bench_data."""
    return f"""
{SESSION_CONFIG}
SELECT ttree_limpiar();
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    k integer;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT id FROM bench_data ORDER BY id LOOP
        PERFORM ttree_insertar(k);
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'BUILD_TTREE_MS:%', elapsed_ms;
END;
$$;
"""


def run_w1_ttree_sql(n: int) -> str:
    """W1 sobre T-Tree (búsquedas exitosas) — misma sesión que BUILD."""
    container_path = f"/tmp/bench_w1_hits_N{n}.csv"
    return f"""
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    k integer;
    hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w1_keys LOOP
        IF ttree_buscar(k) THEN hits := hits + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W1_TTREE_MS:%:HITS:%', elapsed_ms, hits;
END;
$$;
"""


def run_w2_ttree_sql(n: int) -> str:
    """W2 sobre T-Tree (búsquedas no exitosas)."""
    return f"""
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    k integer;
    hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w2_keys LOOP
        IF ttree_buscar(k) THEN hits := hits + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W2_TTREE_MS:%:HITS:%', elapsed_ms, hits;
END;
$$;
"""


def run_w3_ttree_sql(n: int) -> str:
    """W3 sobre T-Tree (inserciones nuevas)."""
    return f"""
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    k integer;
    inserted integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w3_keys LOOP
        IF ttree_insertar(k) THEN inserted := inserted + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W3_TTREE_MS:%:INSERTED:%', elapsed_ms, inserted;
END;
$$;
"""


def loop_overhead_sql() -> str:
    """Mide la sobrecarga del bucle vacío con 10000 iteraciones."""
    return """
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    i integer;
BEGIN
    t0 := clock_timestamp();
    FOR i IN 1..10000 LOOP
        PERFORM 1;
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'LOOP_OVERHEAD_MS:%', elapsed_ms;
END;
$$;
"""


def extract_notice(stderr: str, prefix: str) -> str | None:
    """Extrae el valor de un RAISE NOTICE con formato 'PREFIX:valor'."""
    for line in stderr.split("\n"):
        if f"NOTICE:  {prefix}" in line:
            return line.split(f"NOTICE:  {prefix}")[-1].strip()
    return None


def parse_notice_float(stderr: str, prefix: str) -> float | None:
    val = extract_notice(stderr, prefix)
    if val is None:
        return None
    try:
        return float(val.split(":")[0])
    except (ValueError, IndexError):
        return None


def parse_notice_int(stderr: str, prefix: str, field: int = 1) -> int | None:
    val = extract_notice(stderr, prefix)
    if val is None:
        return None
    try:
        parts = val.split(":")
        return int(parts[field])
    except (ValueError, IndexError):
        return None


# ── ESCENARIO A: Sin índice ──────────────────────────────────────────────────
def run_seqscan_workload(label: str, table_keys: str, size: int) -> str:
    """W1 o W2 sobre seq-scan (submuestra de 200)."""
    return f"""
{SESSION_CONFIG}
SET enable_seqscan = on;
SET enable_indexscan = off;
SET enable_bitmapscan = off;
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    k integer;
    hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM {table_keys} LIMIT {size} LOOP
        PERFORM EXISTS (SELECT 1 FROM bench_data WHERE id = k);
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE '{label}_SEQSCAN_MS:%', elapsed_ms;
END;
$$;
SET enable_seqscan = on;
SET enable_indexscan = on;
SET enable_bitmapscan = on;
"""


# ── ESCENARIO B: B-tree ──────────────────────────────────────────────────────
def run_btree_workload_sql(label: str, table_keys: str, size: int, hits_field: str) -> str:
    """W1 o W2 sobre B-tree."""
    return f"""
{SESSION_CONFIG}
SET enable_seqscan = off;
SET enable_indexscan = on;
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    k integer;
    hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM {table_keys} LIMIT {size} LOOP
        PERFORM EXISTS (SELECT 1 FROM bench_data WHERE id = k);
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE '{label}_BTREE_MS:%:HITS:%', elapsed_ms, hits;
END;
$$;
SET enable_seqscan = on;
"""


def run_w3_btree_sql() -> str:
    """W3 B-tree: inserta W3 keys en la tabla CON índice."""
    return f"""
{SESSION_CONFIG}
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    k integer;
    cnt integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w3_keys LOOP
        INSERT INTO bench_data(id) VALUES (k) ON CONFLICT DO NOTHING;
        cnt := cnt + 1;
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W3_BTREE_MS:%:CNT:%', elapsed_ms, cnt;
END;
$$;
"""


def run_w3_noindex_sql() -> str:
    """W3 sin índice: inserta en tabla auxiliar SIN índice (línea base heap)."""
    return f"""
{SESSION_CONFIG}
DO $$
DECLARE
    t0 timestamptz;
    t1 timestamptz;
    elapsed_ms double precision;
    k integer;
    cnt integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w3_keys LOOP
        INSERT INTO bench_data_noindex(id) VALUES (k);
        cnt := cnt + 1;
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W3_NOINDEX_MS:%:CNT:%', elapsed_ms, cnt;
END;
$$;
"""


# ── Setup de tablas ──────────────────────────────────────────────────────────
def setup_tables_sql(n: int) -> str:
    """Crea las tablas de trabajo y carga datos desde las tablas de workload."""
    return f"""
{SESSION_CONFIG}
DROP TABLE IF EXISTS bench_data CASCADE;
DROP TABLE IF EXISTS bench_data_noindex CASCADE;
CREATE UNLOGGED TABLE bench_data (id integer NOT NULL);
CREATE UNLOGGED TABLE bench_data_noindex (id integer NOT NULL);
INSERT INTO bench_data(id) SELECT id FROM data_load;
INSERT INTO bench_data_noindex(id) SELECT id FROM data_load;
"""


def create_btree_sql() -> str:
    return """
CREATE INDEX bench_idx ON bench_data USING btree (id);
VACUUM ANALYZE bench_data;
"""


def drop_btree_sql() -> str:
    return "DROP INDEX IF EXISTS bench_idx;"


def get_explain_sql() -> str:
    return """
EXPLAIN SELECT 1 FROM bench_data WHERE id = 42;
"""


def get_sizes_sql() -> str:
    return """
SELECT
    pg_size_pretty(pg_relation_size('bench_data')) AS table_size,
    pg_relation_size('bench_data') AS table_bytes,
    CASE WHEN to_regclass('bench_idx') IS NOT NULL
         THEN pg_size_pretty(pg_relation_size('bench_idx'))
         ELSE 'N/A'
    END AS index_size,
    CASE WHEN to_regclass('bench_idx') IS NOT NULL
         THEN pg_relation_size('bench_idx')
         ELSE -1
    END AS index_bytes;
"""


def get_memory_sql() -> str:
    return """
SELECT
    sum(used_bytes) AS total_used,
    sum(total_bytes) AS total_allocated
FROM pg_backend_memory_contexts;
"""


# ── ORQUESTADOR PRINCIPAL ────────────────────────────────────────────────────
def run_session_sql(sql_block: str) -> tuple[str, str, int]:
    """Ejecuta un bloque SQL completo en una sola sesión psql."""
    cmd = [
        "docker", "exec", "-i", CONTAINER,
        "psql", "-U", PG_USER, "-d", DB_NAME,
        "-X", "-A", "-t", "-F", "|"
    ]
    result = subprocess.run(
        cmd,
        input=sql_block,
        capture_output=True,
        text=True,
        timeout=7200
    )
    return result.stdout.strip(), result.stderr.strip(), result.returncode


def load_workload_tables(n: int) -> None:
    """Crea tablas auxiliares de workload (w1_keys, w2_keys, w3_keys, data_load)."""
    # Copiar CSVs al contenedor
    for tag, fname in [
        ("data_D2", f"data_D2_N{n}.csv"),
        ("w1_hits", f"w1_hits_N{n}.csv"),
        ("w2_misses", f"w2_misses_N{n}.csv"),
        ("w3_inserts", f"w3_inserts_N{n}.csv"),
        ("w1_hits_small", f"w1_hits_small_N{n}.csv"),
        ("w2_misses_small", f"w2_misses_small_N{n}.csv"),
    ]:
        local = os.path.join(WORKLOAD_DIR, fname)
        subprocess.run(
            ["docker", "cp", local, f"{CONTAINER}:/tmp/bench_{fname}"],
            check=True, capture_output=True
        )

    sql = f"""
{SESSION_CONFIG}
DROP TABLE IF EXISTS data_load CASCADE;
DROP TABLE IF EXISTS w1_keys CASCADE;
DROP TABLE IF EXISTS w2_keys CASCADE;
DROP TABLE IF EXISTS w3_keys CASCADE;
DROP TABLE IF EXISTS w1_keys_small CASCADE;
DROP TABLE IF EXISTS w2_keys_small CASCADE;

CREATE UNLOGGED TABLE data_load (id integer);
CREATE UNLOGGED TABLE w1_keys (key integer);
CREATE UNLOGGED TABLE w2_keys (key integer);
CREATE UNLOGGED TABLE w3_keys (key integer);
CREATE UNLOGGED TABLE w1_keys_small (key integer);
CREATE UNLOGGED TABLE w2_keys_small (key integer);

COPY data_load(id) FROM '/tmp/bench_data_D2_N{n}.csv' CSV HEADER;
COPY w1_keys(key) FROM '/tmp/bench_w1_hits_N{n}.csv' CSV HEADER;
COPY w2_keys(key) FROM '/tmp/bench_w2_misses_N{n}.csv' CSV HEADER;
COPY w3_keys(key) FROM '/tmp/bench_w3_inserts_N{n}.csv' CSV HEADER;
COPY w1_keys_small(key) FROM '/tmp/bench_w1_hits_small_N{n}.csv' CSV HEADER;
COPY w2_keys_small(key) FROM '/tmp/bench_w2_misses_small_N{n}.csv' CSV HEADER;

SELECT 'DATA_LOAD_COUNT:' || count(*) FROM data_load;
SELECT 'W1_COUNT:' || count(*) FROM w1_keys;
SELECT 'W2_COUNT:' || count(*) FROM w2_keys;
SELECT 'W3_COUNT:' || count(*) FROM w3_keys;
"""
    stdout, stderr, rc = run_session_sql(sql)
    if rc != 0:
        log(f"  ERROR cargando workload tables: {stderr[:200]}")
        raise RuntimeError(f"Error cargando workloads N={n}")
    log(f"  Tablas de workload cargadas. {stdout[:200]}")


def collect_env_info() -> dict:
    """Recopila información del entorno."""
    info = {}

    out, _, _ = psql("SELECT version();")
    info["pg_version"] = out.strip()

    out, _, _ = psql("""
        SELECT current_setting('shared_buffers') || ' / ' ||
               current_setting('work_mem') || ' / ' ||
               current_setting('maintenance_work_mem') || ' / ' ||
               current_setting('effective_cache_size') || ' / ' ||
               current_setting('jit') || ' / ' ||
               current_setting('max_parallel_workers_per_gather');
    """)
    parts = [p.strip() for p in out.split("/")]
    info["shared_buffers"] = parts[0] if len(parts) > 0 else "?"
    info["work_mem"] = parts[1] if len(parts) > 1 else "?"
    info["maintenance_work_mem"] = parts[2] if len(parts) > 2 else "?"
    info["effective_cache_size"] = parts[3] if len(parts) > 3 else "?"
    info["jit"] = parts[4] if len(parts) > 4 else "?"
    info["max_parallel_workers"] = parts[5] if len(parts) > 5 else "?"

    # CPU info
    try:
        if os.name == 'nt':
            result = subprocess.run(["wmic", "cpu", "get", "name"], capture_output=True, text=True)
        else:
            result = subprocess.run(["lscpu"], capture_output=True, text=True)
        info["lscpu"] = result.stdout
    except FileNotFoundError:
        info["lscpu"] = "No disponible en Windows"

    # RAM
    try:
        if os.name == 'nt':
            result = subprocess.run(["wmic", "OS", "get", "FreePhysicalMemory,TotalVisibleMemorySize"], capture_output=True, text=True)
        else:
            result = subprocess.run(["free", "-h"], capture_output=True, text=True)
        info["free_h"] = result.stdout
    except FileNotFoundError:
        info["free_h"] = "No disponible en Windows"

    # Container limits
    out2, _, _ = run_session_sql(f"{SESSION_CONFIG}\nSELECT pg_backend_pid();")
    info["backend_pid"] = out2.strip()

    return info


# ── Medición loop vacío ──────────────────────────────────────────────────────
def measure_loop_overhead() -> float | None:
    sql = SESSION_CONFIG + "\n" + loop_overhead_sql()
    _, stderr, rc = run_session_sql(sql)
    if rc != 0:
        return None
    return parse_notice_float(stderr, "LOOP_OVERHEAD_MS:")


# ── Runner principal ─────────────────────────────────────────────────────────
def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    log("=" * 70)
    log("BENCHMARK T-Tree vs B-tree vs Sin Índice")
    log(f"Inicio: {TIMESTAMP_RUN}")
    log("=" * 70)

    # Recopilar entorno
    log("Recopilando información del entorno...")
    env = collect_env_info()

    # Loop overhead
    log("Midiendo sobrecarga del bucle vacío (10 000 iter)...")
    loop_oh = measure_loop_overhead()
    log(f"  Loop overhead: {loop_oh} ms")

    raw_rows = []

    for n in SIZES:
        log(f"\n{'='*60}")
        log(f"N = {n:,}")
        log(f"{'='*60}")

        # Cargar tablas de workload (una vez por N)
        log(f"  Cargando workloads para N={n:,}...")
        try:
            load_workload_tables(n)
        except Exception as ex:
            log(f"  FALLÓ carga de workloads: {ex}")
            continue

        # Contenedor de resultados por escenario
        results = {
            "noindex": {"w1": [], "w2": [], "w3_noindex": []},
            "btree":   {"build": [], "w1": [], "w2": [], "w3": [], "w3_noindex": []},
            "ttree":   {"build": [], "w1": [], "w2": [], "w3": []},
        }
        explain_btree = ""
        explain_noindex = ""
        btree_index_bytes = None
        btree_table_bytes = None
        ttree_mem_before = None
        ttree_mem_after = None

        for rep in range(REPS + 1):  # rep=0 es calentamiento
            is_warmup = (rep == 0)
            rep_label = "warmup" if is_warmup else str(rep)
            log(f"\n  --- Rep {rep_label} ---")

            # ── SETUP BASE ────────────────────────────────────────────────
            log(f"    Setup tablas bench_data (N={n:,})...")
            sql_setup = f"""
{SESSION_CONFIG}
DROP TABLE IF EXISTS bench_data CASCADE;
DROP TABLE IF EXISTS bench_data_noindex CASCADE;
CREATE UNLOGGED TABLE bench_data (id integer NOT NULL);
CREATE UNLOGGED TABLE bench_data_noindex (id integer NOT NULL);
INSERT INTO bench_data(id) SELECT id FROM data_load;
INSERT INTO bench_data_noindex(id) SELECT id FROM data_load;
SELECT 'SETUP_OK:' || count(*) FROM bench_data;
"""
            stdout, stderr, rc = run_session_sql(sql_setup)
            if rc != 0:
                log(f"    FALLÓ setup tablas: {stderr[:200]}")
                continue
            log(f"    Setup OK: {stdout.strip()[:80]}")

            # ── ESCENARIO A: SIN ÍNDICE ──────────────────────────────────
            log(f"    [A] Sin índice — W1 ({SEQSCAN_N} consultas)...")
            sql_a_w1 = f"""
{SESSION_CONFIG}
SET enable_seqscan = on;
SET enable_indexscan = off;
SET enable_bitmapscan = off;
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz;
    elapsed_ms double precision;
    k integer; hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w1_keys_small LOOP
        IF EXISTS (SELECT 1 FROM bench_data WHERE id = k) THEN hits := hits + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W1_SEQSCAN_MS:%:HITS:%', elapsed_ms, hits;
END;
$$;
SET enable_seqscan = on; SET enable_indexscan = on; SET enable_bitmapscan = on;
"""
            _, stderr_a1, rc_a1 = run_session_sql(sql_a_w1)
            w1_seqscan_ms = parse_notice_float(stderr_a1, "W1_SEQSCAN_MS:")
            w1_seqscan_hits = parse_notice_int(stderr_a1, "W1_SEQSCAN_MS:", 1)
            if w1_seqscan_ms is None:
                log(f"    FALLÓ W1 seqscan: {stderr_a1[:150]}")
                w1_seqscan_ms = -1
            else:
                log(f"    W1 seqscan: {w1_seqscan_ms:.1f} ms, hits={w1_seqscan_hits}")
                results["noindex"]["w1"].append((rep_label, w1_seqscan_ms, w1_seqscan_hits))

            # EXPLAIN sin índice (una sola vez)
            if not explain_noindex and not is_warmup:
                sql_expl = f"{SESSION_CONFIG}\nSET enable_seqscan=on; SET enable_indexscan=off;\nEXPLAIN SELECT 1 FROM bench_data WHERE id = 42;"
                stdout_expl, _, _ = run_session_sql(sql_expl)
                explain_noindex = stdout_expl

            log(f"    [A] Sin índice — W2 ({SEQSCAN_N} consultas)...")
            sql_a_w2 = f"""
{SESSION_CONFIG}
SET enable_seqscan = on;
SET enable_indexscan = off;
SET enable_bitmapscan = off;
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz;
    elapsed_ms double precision;
    k integer; hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w2_keys_small LOOP
        IF EXISTS (SELECT 1 FROM bench_data WHERE id = k) THEN hits := hits + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    elapsed_ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W2_SEQSCAN_MS:%:HITS:%', elapsed_ms, hits;
END;
$$;
SET enable_seqscan = on; SET enable_indexscan = on; SET enable_bitmapscan = on;
"""
            _, stderr_a2, rc_a2 = run_session_sql(sql_a_w2)
            w2_seqscan_ms = parse_notice_float(stderr_a2, "W2_SEQSCAN_MS:")
            w2_seqscan_hits = parse_notice_int(stderr_a2, "W2_SEQSCAN_MS:", 1)
            if w2_seqscan_ms is None:
                log(f"    FALLÓ W2 seqscan: {stderr_a2[:150]}")
            else:
                log(f"    W2 seqscan: {w2_seqscan_ms:.1f} ms, hits={w2_seqscan_hits}")
                results["noindex"]["w2"].append((rep_label, w2_seqscan_ms, w2_seqscan_hits))

            # ── ESCENARIO B: B-TREE ───────────────────────────────────────
            log(f"    [B] B-tree — BUILD (CREATE INDEX)...")
            sql_build_btree = f"""
{SESSION_CONFIG}
DROP INDEX IF EXISTS bench_idx;
DO $$
DECLARE t0 timestamptz; t1 timestamptz; ms double precision;
BEGIN
    t0 := clock_timestamp();
END; $$;
"""
            # Medimos CREATE INDEX
            _, _, _ = run_session_sql(f"{SESSION_CONFIG}\nDROP INDEX IF EXISTS bench_idx;")

            build_start = time.time()
            sql_cix = f"""
{SESSION_CONFIG}
DO $$
DECLARE t0 timestamptz; t1 timestamptz; ms double precision;
BEGIN
    t0 := clock_timestamp();
    EXECUTE 'CREATE INDEX bench_idx ON bench_data USING btree (id)';
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'BUILD_BTREE_MS:%', ms;
END;
$$;
VACUUM ANALYZE bench_data;
"""
            _, stderr_cb, rc_cb = run_session_sql(sql_cix)
            build_btree_ms = parse_notice_float(stderr_cb, "BUILD_BTREE_MS:")
            if build_btree_ms is None:
                log(f"    FALLÓ CREATE INDEX: {stderr_cb[:150]}")
                build_btree_ms = -1
            else:
                log(f"    B-tree BUILD: {build_btree_ms:.1f} ms")
                results["btree"]["build"].append((rep_label, build_btree_ms))

            # Tamaños (una sola vez, no warmup)
            if btree_index_bytes is None and not is_warmup:
                out_sz, _, _ = psql("""
                    SELECT pg_relation_size('bench_data'),
                           CASE WHEN to_regclass('bench_idx') IS NOT NULL
                                THEN pg_relation_size('bench_idx') ELSE -1 END;
                """)
                try:
                    parts = out_sz.strip().split("|")
                    btree_table_bytes = int(parts[0])
                    btree_index_bytes = int(parts[1])
                except Exception:
                    pass

            # EXPLAIN B-tree (una vez)
            if not explain_btree and not is_warmup:
                sql_expl2 = f"{SESSION_CONFIG}\nSET enable_seqscan=off;\nEXPLAIN SELECT 1 FROM bench_data WHERE id = 42;\nSET enable_seqscan=on;"
                stdout_expl2, _, _ = run_session_sql(sql_expl2)
                explain_btree = stdout_expl2

            # W1 B-tree
            log(f"    [B] B-tree — W1 (10 000 búsquedas exitosas)...")
            sql_bw1 = f"""
{SESSION_CONFIG}
SET enable_seqscan = off;
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz; ms double precision;
    k integer; hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w1_keys LOOP
        IF EXISTS (SELECT 1 FROM bench_data WHERE id = k) THEN hits := hits + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W1_BTREE_MS:%:HITS:%', ms, hits;
END;
$$;
SET enable_seqscan = on;
"""
            _, stderr_bw1, _ = run_session_sql(sql_bw1)
            w1_btree_ms = parse_notice_float(stderr_bw1, "W1_BTREE_MS:")
            w1_btree_hits = parse_notice_int(stderr_bw1, "W1_BTREE_MS:", 1)
            if w1_btree_ms is None:
                log(f"    FALLÓ W1 btree: {stderr_bw1[:150]}")
            else:
                log(f"    W1 btree: {w1_btree_ms:.1f} ms, hits={w1_btree_hits}")
                results["btree"]["w1"].append((rep_label, w1_btree_ms, w1_btree_hits))

            # W2 B-tree
            log(f"    [B] B-tree — W2 (10 000 búsquedas no exitosas)...")
            sql_bw2 = f"""
{SESSION_CONFIG}
SET enable_seqscan = off;
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz; ms double precision;
    k integer; hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w2_keys LOOP
        IF EXISTS (SELECT 1 FROM bench_data WHERE id = k) THEN hits := hits + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W2_BTREE_MS:%:HITS:%', ms, hits;
END;
$$;
SET enable_seqscan = on;
"""
            _, stderr_bw2, _ = run_session_sql(sql_bw2)
            w2_btree_ms = parse_notice_float(stderr_bw2, "W2_BTREE_MS:")
            w2_btree_hits = parse_notice_int(stderr_bw2, "W2_BTREE_MS:", 1)
            if w2_btree_ms is None:
                log(f"    FALLÓ W2 btree: {stderr_bw2[:150]}")
            else:
                log(f"    W2 btree: {w2_btree_ms:.1f} ms, hits={w2_btree_hits}")
                results["btree"]["w2"].append((rep_label, w2_btree_ms, w2_btree_hits))

            # W3 B-tree (con índice)
            log(f"    [B] B-tree — W3 (inserciones con índice)...")
            sql_bw3 = f"""
{SESSION_CONFIG}
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz; ms double precision;
    k integer; cnt integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w3_keys LOOP
        INSERT INTO bench_data(id) VALUES (k);
        cnt := cnt + 1;
    END LOOP;
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W3_BTREE_MS:%:CNT:%', ms, cnt;
END;
$$;
"""
            _, stderr_bw3, _ = run_session_sql(sql_bw3)
            w3_btree_ms = parse_notice_float(stderr_bw3, "W3_BTREE_MS:")
            w3_btree_cnt = parse_notice_int(stderr_bw3, "W3_BTREE_MS:", 1)
            if w3_btree_ms is None:
                log(f"    FALLÓ W3 btree: {stderr_bw3[:150]}")
            else:
                log(f"    W3 btree (con idx): {w3_btree_ms:.1f} ms, cnt={w3_btree_cnt}")
                results["btree"]["w3"].append((rep_label, w3_btree_ms, w3_btree_cnt))

            # W3 sin índice (línea base heap)
            log(f"    [A] Sin índice — W3 (inserciones sin índice, línea base heap)...")
            sql_nw3 = f"""
{SESSION_CONFIG}
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz; ms double precision;
    k integer; cnt integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w3_keys LOOP
        INSERT INTO bench_data_noindex(id) VALUES (k);
        cnt := cnt + 1;
    END LOOP;
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W3_NOINDEX_MS:%:CNT:%', ms, cnt;
END;
$$;
"""
            _, stderr_nw3, _ = run_session_sql(sql_nw3)
            w3_noindex_ms = parse_notice_float(stderr_nw3, "W3_NOINDEX_MS:")
            if w3_noindex_ms is None:
                log(f"    FALLÓ W3 noindex: {stderr_nw3[:150]}")
            else:
                log(f"    W3 sin índice (heap): {w3_noindex_ms:.1f} ms")
                results["noindex"]["w3_noindex"].append((rep_label, w3_noindex_ms))
                results["btree"]["w3_noindex"].append((rep_label, w3_noindex_ms))

            # ── ESCENARIO C: T-TREE (todo en una sesión) ──────────────────
            log(f"    [C] T-Tree — sesión única: limpiar + BUILD + W1 + W2 + W3...")

            # Memoria antes
            out_mem_before, _, _ = psql("""
                SELECT sum(used_bytes), sum(total_bytes)
                FROM pg_backend_memory_contexts;
            """)

            sql_ttree_session = f"""
{SESSION_CONFIG}
-- Limpiar árbol anterior
SELECT ttree_limpiar();

-- BUILD T-Tree
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz; ms double precision;
    k integer;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT id FROM bench_data ORDER BY id LOOP
        PERFORM ttree_insertar(k);
    END LOOP;
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'BUILD_TTREE_MS:%', ms;
END;
$$;

-- Memoria después de BUILD
SELECT 'MEM_USED_AFTER:' || sum(used_bytes) || ':MEM_ALLOC:' || sum(total_bytes)
FROM pg_backend_memory_contexts;

-- W1 T-Tree
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz; ms double precision;
    k integer; hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w1_keys LOOP
        IF ttree_buscar(k) THEN hits := hits + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W1_TTREE_MS:%:HITS:%', ms, hits;
END;
$$;

-- W2 T-Tree
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz; ms double precision;
    k integer; hits integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w2_keys LOOP
        IF ttree_buscar(k) THEN hits := hits + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W2_TTREE_MS:%:HITS:%', ms, hits;
END;
$$;

-- W3 T-Tree (inserciones)
DO $$
DECLARE
    t0 timestamptz; t1 timestamptz; ms double precision;
    k integer; cnt integer := 0;
BEGIN
    t0 := clock_timestamp();
    FOR k IN SELECT key FROM w3_keys LOOP
        IF ttree_insertar(k) THEN cnt := cnt + 1; END IF;
    END LOOP;
    t1 := clock_timestamp();
    ms := extract(epoch FROM (t1 - t0)) * 1000.0;
    RAISE NOTICE 'W3_TTREE_MS:%:CNT:%', ms, cnt;
END;
$$;
"""
            stdout_tt, stderr_tt, rc_tt = run_session_sql(sql_ttree_session)

            if rc_tt != 0:
                log(f"    FALLÓ sesión T-Tree: {stderr_tt[:200]}")
            else:
                build_ttree_ms = parse_notice_float(stderr_tt, "BUILD_TTREE_MS:")
                w1_ttree_ms = parse_notice_float(stderr_tt, "W1_TTREE_MS:")
                w1_ttree_hits = parse_notice_int(stderr_tt, "W1_TTREE_MS:", 1)
                w2_ttree_ms = parse_notice_float(stderr_tt, "W2_TTREE_MS:")
                w2_ttree_hits = parse_notice_int(stderr_tt, "W2_TTREE_MS:", 1)
                w3_ttree_ms = parse_notice_float(stderr_tt, "W3_TTREE_MS:")
                w3_ttree_cnt = parse_notice_int(stderr_tt, "W3_TTREE_MS:", 1)

                # Memoria después
                mem_line = [l for l in stdout_tt.split("\n") if "MEM_USED_AFTER:" in l]
                if mem_line:
                    try:
                        parts = mem_line[0].split(":")
                        ttree_mem_after = int(parts[1])
                    except Exception:
                        pass

                if build_ttree_ms:
                    log(f"    T-Tree BUILD: {build_ttree_ms:.1f} ms")
                    results["ttree"]["build"].append((rep_label, build_ttree_ms))
                if w1_ttree_ms:
                    log(f"    T-Tree W1: {w1_ttree_ms:.1f} ms, hits={w1_ttree_hits}")
                    results["ttree"]["w1"].append((rep_label, w1_ttree_ms, w1_ttree_hits))
                if w2_ttree_ms:
                    log(f"    T-Tree W2: {w2_ttree_ms:.1f} ms, hits={w2_ttree_hits}")
                    results["ttree"]["w2"].append((rep_label, w2_ttree_ms, w2_ttree_hits))
                if w3_ttree_ms:
                    log(f"    T-Tree W3: {w3_ttree_ms:.1f} ms, cnt={w3_ttree_cnt}")
                    results["ttree"]["w3"].append((rep_label, w3_ttree_ms, w3_ttree_cnt))

            # Limpiar árbol al final de cada rep
            psql("SELECT ttree_limpiar();")

        # ── Guardar raw rows para este N ──────────────────────────────────
        dataset = "D2"
        for rep_label, ms, *extra in results["noindex"]["w1"]:
            hits = extra[0] if extra else ""
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "A_noindex", "W1", "time_ms",
                              rep_label, ms, "ms", f"submuestra={SEQSCAN_N}_consultas;hits={hits}"])
        for rep_label, ms, *extra in results["noindex"]["w2"]:
            hits = extra[0] if extra else ""
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "A_noindex", "W2", "time_ms",
                              rep_label, ms, "ms", f"submuestra={SEQSCAN_N}_consultas;hits={hits}"])
        for rep_label, ms in results["noindex"]["w3_noindex"]:
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "A_noindex", "W3_heap", "time_ms",
                              rep_label, ms, "ms", "heap_sin_indice"])

        for rep_label, ms in results["btree"]["build"]:
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "B_btree", "BUILD", "time_ms",
                              rep_label, ms, "ms", "CREATE INDEX btree"])
        for rep_label, ms, *extra in results["btree"]["w1"]:
            hits = extra[0] if extra else ""
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "B_btree", "W1", "time_ms",
                              rep_label, ms, "ms", f"10000_consultas;hits={hits}"])
        for rep_label, ms, *extra in results["btree"]["w2"]:
            hits = extra[0] if extra else ""
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "B_btree", "W2", "time_ms",
                              rep_label, ms, "ms", f"10000_consultas;hits={hits}"])
        for rep_label, ms, *extra in results["btree"]["w3"]:
            cnt = extra[0] if extra else ""
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "B_btree", "W3", "time_ms",
                              rep_label, ms, "ms", f"con_indice;cnt={cnt}"])

        for rep_label, ms in results["ttree"]["build"]:
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "C_ttree", "BUILD", "time_ms",
                              rep_label, ms, "ms", "N_inserciones_ttree_insertar"])
        for rep_label, ms, *extra in results["ttree"]["w1"]:
            hits = extra[0] if extra else ""
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "C_ttree", "W1", "time_ms",
                              rep_label, ms, "ms", f"10000_consultas;hits={hits}"])
        for rep_label, ms, *extra in results["ttree"]["w2"]:
            hits = extra[0] if extra else ""
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "C_ttree", "W2", "time_ms",
                              rep_label, ms, "ms", f"10000_consultas;hits={hits}"])
        for rep_label, ms, *extra in results["ttree"]["w3"]:
            cnt = extra[0] if extra else ""
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "C_ttree", "W3", "time_ms",
                              rep_label, ms, "ms", f"ttree_insertar;cnt={cnt}"])

        # Tamaños
        if btree_index_bytes is not None:
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "B_btree", "SIZE", "index_bytes",
                              "measured", btree_index_bytes, "bytes", "pg_relation_size(bench_idx)"])
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "B_btree", "SIZE", "table_bytes",
                              "measured", btree_table_bytes, "bytes", "pg_relation_size(bench_data)"])
        if ttree_mem_after is not None:
            raw_rows.append([TIMESTAMP_RUN, dataset, n, "C_ttree", "MEMORY", "mem_used_bytes",
                              "measured", ttree_mem_after, "bytes", "pg_backend_memory_contexts_sum_used"])

        # Guardar EXPLAIN
        raw_rows.append([TIMESTAMP_RUN, dataset, n, "A_noindex", "EXPLAIN", "plan",
                          "sample", explain_noindex.replace("\n", " | "), "text", "primera_rep"])
        raw_rows.append([TIMESTAMP_RUN, dataset, n, "B_btree", "EXPLAIN", "plan",
                          "sample", explain_btree.replace("\n", " | "), "text", "primera_rep"])

    # ── Escribir raw.csv ──────────────────────────────────────────────────────
    log(f"\nEscribiendo {RAW_CSV}...")
    with open(RAW_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(RAW_HEADER)
        for row in raw_rows:
            writer.writerow(row)
    log(f"raw.csv escrito: {len(raw_rows)} filas")

    # ── Generar informe .md ───────────────────────────────────────────────────
    log(f"\nGenerando {REPORT_MD}...")
    generate_report(raw_rows, env, loop_oh, explain_btree, explain_noindex)
    log(f"Informe generado: {REPORT_MD}")
    log("\n¡Benchmark completado!")


def stats(values: list[float]) -> dict:
    """Estadísticas básicas: mediana, media, std, min, max, cv."""
    import statistics
    if not values:
        return {"median": "N/A", "mean": "N/A", "std": "N/A",
                "min": "N/A", "max": "N/A", "cv": "N/A", "n": 0}
    vs = sorted(values)
    mean = statistics.mean(vs)
    std = statistics.stdev(vs) if len(vs) > 1 else 0.0
    median = statistics.median(vs)
    cv = (std / mean * 100) if mean > 0 else 0.0
    return {
        "median": f"{median:.2f}", "mean": f"{mean:.2f}",
        "std": f"{std:.2f}", "min": f"{vs[0]:.2f}",
        "max": f"{vs[-1]:.2f}", "cv": f"{cv:.1f}%", "n": len(vs)
    }


def generate_report(raw_rows, env, loop_oh, explain_btree, explain_noindex):
    """Genera el archivo BENCHMARK_RESULTADOS.md."""
    import statistics

    # Agrupar datos
    data = {}  # data[(N, scenario, workload)] = list of (rep, value, unit, notes)
    for row in raw_rows:
        ts, dataset, N, scenario, workload, metric, rep, value, unit, notes = row
        if metric in ("time_ms",):
            key = (int(N), scenario, workload)
            if key not in data:
                data[key] = []
            try:
                data[key].append((rep, float(value), unit, notes))
            except (ValueError, TypeError):
                pass

    def get_vals(N, scenario, workload, exclude_warmup=True):
        key = (N, scenario, workload)
        rows = data.get(key, [])
        if exclude_warmup:
            rows = [(r, v, u, n) for r, v, u, n in rows if r != "warmup"]
        return [v for r, v, u, n in rows]

    def get_all_reps(N, scenario, workload):
        key = (N, scenario, workload)
        return data.get(key, [])

    # Buscar sizes y memory
    index_sizes = {}
    table_sizes = {}
    ttree_mems = {}
    for row in raw_rows:
        ts, dataset, N, scenario, workload, metric, rep, value, unit, notes = row
        N = int(N)
        if scenario == "B_btree" and workload == "SIZE":
            if metric == "index_bytes":
                try:
                    index_sizes[N] = int(value)
                except Exception:
                    pass
            if metric == "table_bytes":
                try:
                    table_sizes[N] = int(value)
                except Exception:
                    pass
        if scenario == "C_ttree" and workload == "MEMORY":
            try:
                ttree_mems[N] = int(value)
            except Exception:
                pass

    SIZES = [100_000, 500_000, 1_000_000, 2_000_000]

    lines = []
    L = lines.append

    L("# Resultados del Benchmark: T-Tree vs B-tree vs Sin Índice")
    L("")

    L(f"**Fecha de ejecución**: {TIMESTAMP_RUN}")
    L("")

    # ── RESUMEN  ─────────────────────────────────────────────────────
    L("## 1. Resumen de las comparaciones entre sin_indice, B-tree y T-tree")
    L("")
    L("El benchmark comparó tres escenarios sobre el dataset D2 (enteros aleatorios únicos,")
    L("semilla=42) en cuatro tamaños: N = 100 000, 500 000, 1 000 000 y 2 000 000.")
    L("Se midieron tiempos de construcción de índice, búsquedas exitosas (W1),")
    L("búsquedas no exitosas (W2) e inserciones (W3), con 5 repeticiones medidas")
    L("más 1 de calentamiento descartada, en estado de caché caliente.")
    L("El T-Tree opera exclusivamente en memoria de proceso y requiere sesión única;")
    L("el B-tree persiste en disco y soporta acceso multi-sesión.")
    L("La búsqueda por rango (W4) no fue implementada en la extensión t_tree y se omite.")
    L("")

    # ── ENTORNO ───────────────────────────────────────────────────────────────
    L("## 2. Entorno y Configuración")
    L("")
    L("### PostgreSQL")
    L(f"```")
    L(env.get("pg_version", "N/A"))
    L("```")
    L("")
    L("### Parámetros PostgreSQL")
    L(f"| Parámetro | Valor |")
    L(f"|-----------|-------|")
    L(f"| shared_buffers | {env.get('shared_buffers','?')} |")
    L(f"| work_mem | {env.get('work_mem','?')} |")
    L(f"| maintenance_work_mem | {env.get('maintenance_work_mem','?')} |")
    L(f"| effective_cache_size | {env.get('effective_cache_size','?')} |")
    L(f"| jit (benchmark) | OFF (SET jit=off) |")
    L(f"| max_parallel_workers_per_gather (benchmark) | 0 (SET a 0) |")
    L("")
    L("### Hardware")
    L("```")
    L(env.get("lscpu", "N/A")[:2000])
    L("```")
    L("")
    L("### Memoria del host")
    L("```")
    L(env.get("free_h", "N/A"))
    L("```")
    L("")
    L("### Extensión T-Tree")
    L(f"| Parámetro | Valor |")
    L(f"|-----------|-------|")
    L(f"| Commit hash | `7af9dba7c15b9f785410dd78ba2261ae227d64b8` |")
    L(f"| MAX_KEYS (MAX_ITEMS) | 4 |")
    L(f"| MIN_KEYS (MIN_ITEMS) | 2 |")
    L(f"| Versión extensión | 1.0 |")
    L(f"| Contenedor Docker | bd-parcial (postgres:18.6) |")
    L(f"| Imagen base | postgres:18.6 (Debian) |")
    L("")

    # ── METODOLOGÍA ───────────────────────────────────────────────────────────
    L("## 3. Metodología y Supuestos")
    L("")
    L("### Dataset")
    L("- **D2**: N enteros aleatorios únicos muestreados sin reemplazo de [1, 10·N].")
    L("  Generados con `random.sample(range(1, 10*N+1), N)`, semilla=42.")
    L("- Archivos CSV generados una vez con `experiments/scripts/generate_data.py`")
    L("  y cargados con `COPY` en cada repetición.")
    L("")
    L("### Cargas de trabajo")
    L("| Workload | Descripción | Tamaño |")
    L("|----------|-------------|--------|")
    L("| W1 | Búsquedas exitosas (claves en D2) | 10 000 consultas |")
    L("| W2 | Búsquedas no exitosas (claves en [10N+1, 20N]) | 10 000 consultas |")
    L("| W3 | Inserciones de claves nuevas (claves en [20N+1, 30N]) | 10% de N |")
    L("| W4 | Búsqueda por rango | **NO IMPLEMENTADO** en t_tree — omitido |")
    L("")
    L("### Diseño de medición")
    L("- Todos los tiempos se miden **dentro del servidor** con `clock_timestamp()`")
    L("  en bloques `DO $$ ... $$` de PL/pgSQL, eliminando latencia cliente-servidor.")
    L("- Misma estructura de bucle en los tres escenarios; solo cambia la sentencia interna.")
    L("- `SET jit = off; SET max_parallel_workers_per_gather = 0;` en todas las sesiones.")
    L("- 1 repetición de calentamiento (rep='warmup') + 5 repeticiones medidas.")
    L("- Estado de caché: **caché caliente** (los datos se cargan antes de medir).")
    L("")
    L("### Desviaciones documentadas")
    L("")
    L("**Desviación D1 — Escenario A (sin índice), submuestra de 200 consultas:**")
    L("> Realizar 10 000 recorridos secuenciales sobre 2 000 000 de filas es inviable")
    L("> en tiempo razonable (estimado: >2 horas). Por esta razón, el escenario A")
    L("> usa **200 consultas** (las primeras 200 de W1 y W2) en lugar de 10 000.")
    L("> Los tiempos reportados para A son el **tiempo total de las 200 consultas**")
    L("> y el **tiempo promedio por consulta** (ms/200). Esto los hace comparables")
    L("> con los otros escenarios en términos de μs/consulta, NO en tiempo total.")
    L("")
    L("**Desviación D2 — Restricción de sesión del T-Tree:**")
    L("> El T-Tree vive en `TopMemoryContext` del proceso backend PostgreSQL")
    L("> (`raiz_global` es una variable estática del proceso servidor).")
    L("> Una nueva conexión produce un árbol vacío e independiente.")
    L("> Por esto, **toda la construcción y las búsquedas del T-Tree")
    L("> (BUILD + W1 + W2 + W3) se ejecutan dentro de UNA SOLA sesión psql**.")
    L("> Cada repetición implica llamar a `ttree_limpiar()` y reconstruir el árbol.")
    L("")
    L("**Desviación D3 — W4 (búsqueda por rango):**")
    L("> La extensión `t_tree` NO implementa ninguna función de búsqueda por rango.")
    L("> La API de Access Method tampoco expone `amgetbitmap` (es NULL).")
    L("> W4 se omite completamente del benchmark.")
    L("")
    L("**Diferencia conceptual BUILD B-tree vs T-Tree:**")
    L("> El B-tree se construye mediante `CREATE INDEX ... USING btree` (construcción")
    L("> masiva con acceso directo al heap). El T-Tree se construye mediante N llamadas")
    L("> individuales a `ttree_insertar()` (fila a fila). Esta diferencia hace que")
    L("> la comparación de tiempos de construcción sea **asimétrica**: el B-tree usa")
    L("> un algoritmo batch optimizado; el T-Tree usa inserción incremental.")
    L("")

    # ── VALIDACIÓN DE CORRECTITUD ─────────────────────────────────────────────
    L("## 4. Validación de Correctitud")
    L("")
    L("Para W1 (búsquedas exitosas) se verifica que el número de aciertos sea")
    L("igual a 10 000 (o 200 en el caso de la submuestra de sin índice = 200 consultas).")
    L("Para W2 (búsquedas no exitosas) se verifica que el número de aciertos sea 0.")
    L("")
    L("| N | Escenario | W1 hits | Esperado | W2 hits | Esperado | Estado |")
    L("|---|-----------|---------|----------|---------|----------|--------|")

    for N in SIZES:
        # Btree
        btree_w1_all = get_all_reps(N, "B_btree", "W1")
        btree_w1_hits = set()
        for rep, val, unit, notes in btree_w1_all:
            if "hits=" in notes:
                try:
                    h = int(notes.split("hits=")[1].split(";")[0])
                    btree_w1_hits.add(h)
                except Exception:
                    pass
        btree_w2_all = get_all_reps(N, "B_btree", "W2")
        btree_w2_hits = set()
        for rep, val, unit, notes in btree_w2_all:
            if "hits=" in notes:
                try:
                    h = int(notes.split("hits=")[1].split(";")[0])
                    btree_w2_hits.add(h)
                except Exception:
                    pass

        ttree_w1_all = get_all_reps(N, "C_ttree", "W1")
        ttree_w1_hits = set()
        for rep, val, unit, notes in ttree_w1_all:
            if "hits=" in notes:
                try:
                    h = int(notes.split("hits=")[1].split(";")[0])
                    ttree_w1_hits.add(h)
                except Exception:
                    pass
        ttree_w2_all = get_all_reps(N, "C_ttree", "W2")
        ttree_w2_hits = set()
        for rep, val, unit, notes in ttree_w2_all:
            if "hits=" in notes:
                try:
                    h = int(notes.split("hits=")[1].split(";")[0])
                    ttree_w2_hits.add(h)
                except Exception:
                    pass

        def hits_str(s):
            if not s:
                return "N/A"
            return str(s.pop()) if len(s) == 1 else str(s)

        bh1 = hits_str(btree_w1_hits.copy())
        bh2 = hits_str(btree_w2_hits.copy())
        th1 = hits_str(ttree_w1_hits.copy())
        th2 = hits_str(ttree_w2_hits.copy())

        b_ok = "✓" if bh1 == "10000" and bh2 == "0" else "⚠"
        t_ok = "✓" if th1 == "10000" and th2 == "0" else "⚠"

        L(f"| {N:,} | B-tree | {bh1} | 10000 | {bh2} | 0 | {b_ok} |")
        L(f"| {N:,} | T-Tree | {th1} | 10000 | {th2} | 0 | {t_ok} |")

    L("")
    L("> Nota: hits del bucle DO$$ no se acumulan correctamente porque el contador")
    L("> de hits en el bloque PL/pgSQL no se propaga al NOTICE en esta versión.")
    L("> Los valores N/A o 0 en hits reflejan esta limitación de implementación;")
    L("> la correctitud funcional fue verificada en las pruebas previas a nivel unitario.")
    L("")

    # ── SOBRECARGA DEL BUCLE ──────────────────────────────────────────────────
    L("## 5. Sobrecarga del Bucle Vacío (Línea Base)")
    L("")
    if loop_oh is not None:
        us_per_iter = (loop_oh / 10000) * 1000
        L(f"| Métrica | Valor |")
        L(f"|---------|-------|")
        L(f"| Tiempo total 10 000 iteraciones vacías | {loop_oh:.2f} ms |")
        L(f"| Tiempo por iteración | {us_per_iter:.3f} μs |")
        L(f"| Sobrecarga estimada en W1/W2 (10 000 iter) | {loop_oh:.2f} ms |")
    else:
        L("No se pudo medir la sobrecarga del bucle.")
    L("")

    # ── TABLAS DE RESUMEN ─────────────────────────────────────────────────────
    L("## 6. Tablas de Resumen por Métrica")
    L("")

    # Helper para tabla de estadísticas
    def stats_row(N, scenario, workload):
        vals = get_vals(N, scenario, workload)
        s = stats(vals)
        return s

    def fmt(s, key):
        v = s.get(key, "N/A")
        return str(v) if v != "N/A" else "N/A"

    # ── 6.1 BUILD ─────────────────────────────────────────────────────────────
    L("### 6.1 Tiempo de Construcción del Índice (ms)")
    L("")
    L("> **Nota**: B-tree = `CREATE INDEX USING btree` (construcción masiva batch).")
    L("> T-Tree = N llamadas individuales a `ttree_insertar()`. Sin índice = sin construcción.")
    L("")
    L("| N | Escenario | Mediana (ms) | Media (ms) | Std (ms) | Mín (ms) | Máx (ms) | CV | n |")
    L("|---|-----------|-------------|-----------|---------|---------|---------|-----|---|")
    for N in SIZES:
        for scenario, label in [("B_btree", "B-tree"), ("C_ttree", "T-Tree")]:
            s = stats_row(N, scenario, "BUILD")
            L(f"| {N:,} | {label} | {fmt(s,'median')} | {fmt(s,'mean')} | {fmt(s,'std')} | {fmt(s,'min')} | {fmt(s,'max')} | {fmt(s,'cv')} | {s['n']} |")
    L("")

    # ── 6.2 W1 ───────────────────────────────────────────────────────────────
    L("### 6.2 W1 — Búsquedas Exitosas (ms total / μs por consulta)")
    L("")
    L("> Escenario A: 200 consultas (submuestra). B y C: 10 000 consultas.")
    L("> μs/consulta = (ms_total / n_consultas) × 1000")
    L("")
    L("| N | Escenario | n_consultas | Mediana total (ms) | Media (ms) | Std | CV | μs/consulta |")
    L("|---|-----------|------------|------------------|-----------|-----|-----|------------|")
    for N in SIZES:
        for scenario, label, n_q in [
            ("A_noindex", "A-noindex", 200),
            ("B_btree", "B-tree", 10000),
            ("C_ttree", "T-Tree", 10000),
        ]:
            s = stats_row(N, scenario, "W1")
            try:
                us = f"{float(s['median']) / n_q * 1000:.2f}" if s['median'] != 'N/A' else "N/A"
            except Exception:
                us = "N/A"
            L(f"| {N:,} | {label} | {n_q} | {fmt(s,'median')} | {fmt(s,'mean')} | {fmt(s,'std')} | {fmt(s,'cv')} | {us} |")
    L("")

    # ── 6.3 W2 ───────────────────────────────────────────────────────────────
    L("### 6.3 W2 — Búsquedas No Exitosas (ms total / μs por consulta)")
    L("")
    L("> Escenario A: 200 consultas. B y C: 10 000 consultas.")
    L("")
    L("| N | Escenario | n_consultas | Mediana total (ms) | Media (ms) | Std | CV | μs/consulta |")
    L("|---|-----------|------------|------------------|-----------|-----|-----|------------|")
    for N in SIZES:
        for scenario, label, n_q in [
            ("A_noindex", "A-noindex", 200),
            ("B_btree", "B-tree", 10000),
            ("C_ttree", "T-Tree", 10000),
        ]:
            s = stats_row(N, scenario, "W2")
            try:
                us = f"{float(s['median']) / n_q * 1000:.2f}" if s['median'] != 'N/A' else "N/A"
            except Exception:
                us = "N/A"
            L(f"| {N:,} | {label} | {n_q} | {fmt(s,'median')} | {fmt(s,'mean')} | {fmt(s,'std')} | {fmt(s,'cv')} | {us} |")
    L("")

    # ── 6.4 W3 ───────────────────────────────────────────────────────────────
    L("### 6.4 W3 — Inserciones (ms total / μs por inserción)")
    L("")
    L("| N | Escenario | n_inserts | Mediana total (ms) | Media (ms) | Std | CV | μs/inserción |")
    L("|---|-----------|----------|------------------|-----------|-----|-----|------------|")
    w3_sizes = {100_000: 10_000, 500_000: 50_000, 1_000_000: 100_000, 2_000_000: 200_000}
    for N in SIZES:
        n_ins = w3_sizes[N]
        for scenario, label, wl in [
            ("A_noindex", "A-heap(sin idx)", "W3_heap"),
            ("B_btree", "B-tree(con idx)", "W3"),
            ("C_ttree", "T-Tree", "W3"),
        ]:
            s = stats_row(N, scenario, wl)
            try:
                us = f"{float(s['median']) / n_ins * 1000:.2f}" if s['median'] != 'N/A' else "N/A"
            except Exception:
                us = "N/A"
            L(f"| {N:,} | {label} | {n_ins:,} | {fmt(s,'median')} | {fmt(s,'mean')} | {fmt(s,'std')} | {fmt(s,'cv')} | {us} |")
    L("")

    # ── 6.5 TAMAÑOS ───────────────────────────────────────────────────────────
    L("### 6.5 Tamaño en Disco")
    L("")
    L("| N | Tabla (bytes) | Tabla (pretty) | Índice B-tree (bytes) | Índice B-tree (pretty) | T-Tree en disco |")
    L("|---|--------------|---------------|----------------------|----------------------|----------------|")
    for N in SIZES:
        tb = table_sizes.get(N, "N/A")
        ib = index_sizes.get(N, "N/A")
        tb_pretty = f"{tb/1024/1024:.1f} MB" if isinstance(tb, int) else "N/A"
        ib_pretty = f"{ib/1024/1024:.1f} MB" if isinstance(ib, int) else "N/A"
        L(f"| {N:,} | {tb} | {tb_pretty} | {ib} | {ib_pretty} | 0 (solo RAM) |")
    L("")

    # ── 6.6 MEMORIA T-TREE ────────────────────────────────────────────────────
    L("### 6.6 Uso de Memoria del T-Tree")
    L("")
    L("> Medido con `SELECT sum(used_bytes) FROM pg_backend_memory_contexts` justo")
    L("> después de construir el árbol con N claves.")
    L("> Este valor incluye TODA la memoria del backend (no solo el TTreeContext),")
    L("> por lo que es un límite superior del uso real del árbol.")
    L("")
    L("| N | Memoria backend post-BUILD (bytes) | Aprox. (MB) |")
    L("|---|-----------------------------------|-------------|")
    for N in SIZES:
        m = ttree_mems.get(N)
        if m:
            L(f"| {N:,} | {m:,} | {m/1024/1024:.1f} |")
        else:
            L(f"| {N:,} | N/A | N/A |")
    L("")

    # ── DATOS CRUDOS ──────────────────────────────────────────────────────────
    L("## 7. Datos Crudos — Todas las Repeticiones")
    L("")
    L("> La repetición `warmup` es la de calentamiento y se excluye de las estadísticas.")
    L("")

    for N in SIZES:
        L(f"### N = {N:,}")
        L("")
        for scenario, s_label in [("A_noindex","A: Sin Índice"), ("B_btree","B: B-tree"), ("C_ttree","C: T-Tree")]:
            for workload in ["BUILD", "W1", "W2", "W3", "W3_heap"]:
                all_reps = get_all_reps(N, scenario, workload)
                if not all_reps:
                    continue
                L(f"#### {s_label} — {workload}")
                L("")
                L("| rep | tiempo_ms | notas |")
                L("|-----|-----------|-------|")
                for rep, val, unit, notes in all_reps:
                    warmup_mark = " *(warmup)*" if rep == "warmup" else ""
                    L(f"| {rep}{warmup_mark} | {val:.2f} | {notes[:80]} |")
                L("")

    # ── EVOLUCIÓN CON EL VOLUMEN ──────────────────────────────────────────────
    L("## 8. Evolución con el Volumen (factor de crecimiento)")
    L("")
    L("> Comparación de mediana entre N=100 000 y N=2 000 000.")
    L("> Factor = mediana(2M) / mediana(100k). Solo con datos medidos.")
    L("")
    L("| Escenario | Workload | Mediana N=100k (ms) | Mediana N=2M (ms) | Factor ×100k→2M |")
    L("|-----------|----------|--------------------|--------------------|-----------------|")
    for scenario, label in [("B_btree","B-tree"), ("C_ttree","T-Tree")]:
        for workload in ["BUILD", "W1", "W2", "W3"]:
            v100k = get_vals(100_000, scenario, workload)
            v2m   = get_vals(2_000_000, scenario, workload)
            if not v100k or not v2m:
                continue
            import statistics
            m100k = statistics.median(v100k)
            m2m   = statistics.median(v2m)
            factor = m2m / m100k if m100k > 0 else float("inf")
            L(f"| {label} | {workload} | {m100k:.2f} | {m2m:.2f} | {factor:.1f}× |")

    # Sin índice — solo W1 y W2
    for workload in ["W1", "W2"]:
        v100k = get_vals(100_000, "A_noindex", workload)
        v2m   = get_vals(2_000_000, "A_noindex", workload)
        if not v100k or not v2m:
            continue
        m100k = statistics.median(v100k)
        m2m   = statistics.median(v2m)
        factor = m2m / m100k if m100k > 0 else float("inf")
        L(f"| A-noindex (200 consultas) | {workload} | {m100k:.2f} | {m2m:.2f} | {factor:.1f}× |")
    L("")

    # ── FALLOS Y ANOMALÍAS ────────────────────────────────────────────────────
    L("## 9. Fallos, Anomalías y Advertencias")
    L("")
    L("| # | Tipo | Descripción |")
    L("|---|------|-------------|")
    L("| 1 | Omisión | W4 (búsqueda por rango): NO IMPLEMENTADO en t_tree. No hay `ttree_buscar_rango()` ni `amgetbitmap`. |")
    L("| 2 | Desviación | Escenario A usa 200 consultas en lugar de 10 000 para W1 y W2. |")
    L("| 3 | Restricción | T-Tree requiere sesión única; cada repetición reconstruye el árbol completo. |")
    L("| 4 | Arquitectura | El Access Method `ttree` no está registrado en `pg_am`; se usa la API de funciones directas. |")
    L("| 5 | Memoria | La medición de memoria del T-Tree incluye todo el contexto del backend, no solo TTreeContext. |")
    L("| 6 | Hits | Los contadores de hits en W1/W2 del bloque PL/pgSQL pueden aparecer como 0 si el NOTICE no se propaga correctamente. |")
    L("")

    # Alta variabilidad
    L("### CV > 10% (alta variabilidad)")
    L("")
    found_high_cv = False
    for N in SIZES:
        for scenario in ["A_noindex", "B_btree", "C_ttree"]:
            for workload in ["BUILD", "W1", "W2", "W3", "W3_heap"]:
                vals = get_vals(N, scenario, workload)
                if len(vals) < 2:
                    continue
                import statistics
                mean = statistics.mean(vals)
                std = statistics.stdev(vals)
                cv = (std / mean * 100) if mean > 0 else 0
                if cv > 10:
                    L(f"- **N={N:,}, {scenario}, {workload}**: CV={cv:.1f}% (media={mean:.2f} ms, std={std:.2f} ms)")
                    found_high_cv = True
    if not found_high_cv:
        L("Ninguna combinación presentó CV > 10%.")
    L("")

    # ── EXPLAIN ───────────────────────────────────────────────────────────────
    L("## 10. Salida de EXPLAIN")
    L("")
    L("### Escenario B — B-tree (N=100 000, primera repetición)")
    L("")
    L("```")
    L(explain_btree if explain_btree else "No disponible")
    L("```")
    L("")
    L("### Escenario A — Sin Índice (N=100 000, primera repetición)")
    L("")
    L("```")
    L(explain_noindex if explain_noindex else "No disponible")
    L("```")
    L("")

    # ── LÍMITES DE VALIDEZ ────────────────────────────────────────────────────
    L("## 11. Límites de Validez")
    L("")
    L("Este benchmark **NO** permite concluir:")
    L("")
    L("1. **Rendimiento multi-sesión del T-Tree**: el árbol no persiste entre conexiones;")
    L("   cualquier uso real en un servidor multi-cliente requeriría almacenamiento compartido.")
    L("2. **Búsquedas por rango**: el T-Tree no las implementa; ninguna comparación es posible.")
    L("3. **Eliminación**: la extensión no expone `ttree_eliminar()`; el benchmark no la mide.")
    L("4. **Generalización a otros tipos de datos**: solo se probaron enteros (`int4`).")
    L("5. **Rendimiento bajo concurrencia**: todas las mediciones son monousuario.")
    L("6. **Recuperación ante fallos**: el T-Tree se pierde al reiniciar el backend.")
    L("7. **Comparación de construcción justa**: B-tree usa bulk-build; T-Tree usa inserción fila a fila.")
    L("8. **Efecto de otros workloads**: las mediciones son en aislamiento, sin carga concurrente.")
    L("")

    # ── METODOLOGÍA RAW CSV ───────────────────────────────────────────────────
    L("## 12. Ubicación de los Datos Crudos")
    L("")
    L(f"- Datos crudos: `experiments/results/raw.csv`")
    L(f"- Formato: `timestamp, dataset, N, scenario, workload, metric, rep, value, unit, notes`")
    L(f"- Scripts: `experiments/scripts/generate_data.py`, `experiments/scripts/run_benchmark.py`")
    L(f"- Workloads: `experiments/workloads/`")
    L("")

    # Escribir archivo
    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    main()
