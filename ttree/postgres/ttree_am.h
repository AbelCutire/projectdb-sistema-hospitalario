/*
 * ttree_am.h — Interfaz interna del módulo de integración con PostgreSQL
 *
 * Proyecto Académico: Bases de Datos II
 *
 * Este archivo define las firmas de las funciones que se exponen a PostgreSQL
 * como Index Access Method (IAM). El módulo actúa como adaptador entre la
 * API de PostgreSQL y el núcleo del T-Tree en C.
 *
 * Versión objetivo: PostgreSQL 18.x
 *
 * -------------------------------------------------------------------------
 * NOTA SOBRE LA API DE POSTGRESQL 18
 * -------------------------------------------------------------------------
 * PostgreSQL 17 introdujo cambios en la firma de aminsert:
 *   - Antes de PG17: bool aminsert(Relation, Datum*, bool*, ItemPointer,
 *                                  Relation, IndexUniqueCheck, bool,
 *                                  IndexInfo*)
 *   - PG17+:         bool aminsert(Relation, Datum*, bool*, ItemPointer,
 *                                  Relation, IndexUniqueCheck, bool,
 *                                  IndexInfo*)
 *                    (sin cambios visibles en firma pero sí en semántica
 *                     de IndexUniqueCheck en PG17+)
 *
 * PG18 mantiene compatibilidad con PG17 en este punto.
 * Fuente: src/include/access/amapi.h (PostgreSQL 18 git)
 *
 * -------------------------------------------------------------------------
 * ADVERTENCIA IMPORTANTE
 * -------------------------------------------------------------------------
 * Este módulo NO puede compilarse en Windows sin un entorno PostgreSQL
 * instalado con cabeceras de desarrollo. En Linux/Docker:
 *
 *   apt-get install postgresql-server-dev-18
 *
 * Para compilar el núcleo sin PostgreSQL usa simplemente:
 *   make        (en ttree/)
 *   make test
 */

#ifndef TTREE_AM_H
#define TTREE_AM_H

/*
 * Las inclusiones de PostgreSQL SOLO se activan cuando se compila
 * como extensión (macro PG_MODULE_MAGIC activa automáticamente el contexto PG).
 */
#ifdef BUILDING_TTREE_PG

#include "postgres.h"
#include "fmgr.h"
#include "access/amapi.h"
#include "access/generic_xlog.h"
#include "access/relation.h"
#include "access/reloptions.h"
#include "access/sdir.h"
#include "access/tableam.h"
#include "catalog/index.h"
#include "commands/vacuum.h"
#include "nodes/pathnodes.h"
#include "storage/buf.h"
#include "utils/rel.h"

/* =========================================================================
 * HANDLER PRINCIPAL — registrado en ttree--1.0.sql
 * =========================================================================
 *
 * PostgreSQL llama a este handler para obtener el IndexAmRoutine que
 * describe todas las operaciones del access method.
 *
 * Firma requerida por PostgreSQL (amapi.h):
 *   Datum handler(PG_FUNCTION_ARGS)
 *
 * El handler debe llamar a PG_RETURN_POINTER() con un IndexAmRoutine*.
 */
extern Datum ttree_handler(PG_FUNCTION_ARGS);
PG_FUNCTION_INFO_V1(ttree_handler);

/* =========================================================================
 * FUNCIONES DEL ACCESS METHOD
 * =========================================================================
 *
 * Cada función mapea una operación de PostgreSQL con el T-Tree.
 * Firmas tomadas de src/include/access/amapi.h (PostgreSQL 18).
 */

/* --- Construcción del índice --- */
extern IndexBuildResult *ttree_build_index(Relation heap,
                                           Relation index,
                                           IndexInfo *indexInfo);

/* --- Fase 2 de construcción (heap scan) --- */
extern void ttree_buildempty(Relation index);

/* --- Inserción de una tupla --- */
extern bool ttree_insert(Relation index,
                         Datum    *values,
                         bool     *isnull,
                         ItemPointer heap_tid,
                         Relation heap,
                         IndexUniqueCheck checkUnique,
                         bool             indexUnchanged,
                         IndexInfo       *indexInfo);

/* --- Comienzo de un scan --- */
extern IndexScanDesc ttree_beginscan(Relation index,
                                     int      nkeys,
                                     int      norderbys);

/* --- (Re)configurar condiciones de scan --- */
extern void ttree_rescan(IndexScanDesc scan,
                         ScanKey       scankey,
                         int           nscankeys,
                         ScanKey       orderbys,
                         int           norderbys);

/* --- Obtener siguiente tupla en el scan --- */
extern bool ttree_gettuple(IndexScanDesc scan,
                           ScanDirection direction);

/* --- Obtener múltiples TIDs (bitmap scan) --- */
extern int64 ttree_getbitmap(IndexScanDesc scan,
                              TIDBitmap    *tbm);

/* --- Finalizar un scan --- */
extern void ttree_endscan(IndexScanDesc scan);

/* --- Opciones de almacenamiento del índice --- */
extern bytea *ttree_options(Datum reloptions, bool validate);

/* --- Estimación de costos (planificador) --- */
extern void ttree_costestimate(PlannerInfo *root,
                               IndexPath   *path,
                               double       loop_count,
                               Cost        *indexStartupCost,
                               Cost        *indexTotalCost,
                               Selectivity *indexSelectivity,
                               double      *indexCorrelation,
                               double      *indexPages);

/* --- Validación de clave de scan --- */
extern bool ttree_validate_am(Oid opclassoid);

#endif /* BUILDING_TTREE_PG */

#endif /* TTREE_AM_H */
