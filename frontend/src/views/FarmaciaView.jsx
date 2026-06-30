import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

const getToken = () => localStorage.getItem('token');

const stockLevel = (qty) => {
  if (qty === 0) return { label: 'Sin stock', cls: 'fv-stock-badge--empty' };
  if (qty < 20)  return { label: 'Stock bajo', cls: 'fv-stock-badge--low' };
  return           { label: 'Disponible',  cls: 'fv-stock-badge--ok' };
};

const stockNumColor = (qty) =>
  qty === 0 ? '#dc2626' : qty < 20 ? '#d97706' : '#16a34a';

const totalStock = (med) =>
  (med.stock || []).reduce((acc, s) => acc + (s.cantidad || 0), 0);

const IconFlask = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 3h6l3 9H6L9 3zM6 12l-2 6a1 1 0 0 0 .9 1.5h14.2a1 1 0 0 0 .9-1.5L18 12"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10M3 9h18"/>
  </svg>
);
const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconPackage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconPill = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10.5 20.5L3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z"/>
    <line x1="8.5" y1="11.5" x2="15.5" y2="11.5"/>
  </svg>
);

export default function FarmaciaView() {
  const [medicamentos, setMedicamentos] = useState([]);
  const [farmacias, setFarmacias]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);
  const [tab, setTab]                   = useState('medicamentos');

  useEffect(() => {
    const t = getToken();
    Promise.all([
      api('/medicamento',          { headers: { Authorization: `Bearer ${t}` } }),
      api('/medicamento/farmacias',{ headers: { Authorization: `Bearer ${t}` } }),
    ])
      .then(([meds, farcs]) => {
        setMedicamentos(Array.isArray(meds) ? meds : []);
        setFarmacias(Array.isArray(farcs) ? farcs : []);
      })
      .catch(() => setError('No se pudieron cargar los datos. Verifique la conexión con el servidor.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return medicamentos;
    return medicamentos.filter(m =>
      m.nombre?.toLowerCase().includes(q) ||
      m.monodroga?.descripcion?.toLowerCase().includes(q) ||
      m.accion_terapeutica?.tipo?.toLowerCase().includes(q) ||
      m.laboratorio_produccion?.nombre?.toLowerCase().includes(q)
    );
  }, [medicamentos, search]);

  if (loading) {
    return (
      <div className="fv-loading">
        <div className="fv-loading-spinner" />
        <span>Cargando datos del inventario...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fv-error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Farmacia y Medicamentos</h1>
        <p>Inventario de medicamentos, stock por farmacia y trazabilidad de proveedores.</p>
      </div>

      {/* Tabs */}
      <div className="fv-tabs">
        <button
          className={`fv-tab ${tab === 'medicamentos' ? 'fv-tab--active' : ''}`}
          onClick={() => { setTab('medicamentos'); setSelected(null); }}
        >
          <IconPill />
          Medicamentos
          <span className="fv-tab-count">{medicamentos.length}</span>
        </button>
        <button
          className={`fv-tab ${tab === 'farmacias' ? 'fv-tab--active' : ''}`}
          onClick={() => { setTab('farmacias'); setSelected(null); }}
        >
          <IconPackage />
          Farmacias y Stock
          <span className="fv-tab-count">{farmacias.length}</span>
        </button>
      </div>

      {tab === 'medicamentos' ? (
        <div className="fv-shell">
          {/* Lista */}
          <div className="fv-list-panel">
            <div className="fv-search-wrap">
              <span className="fv-search-icon"><IconSearch /></span>
              <input
                className="fv-search-input"
                type="text"
                placeholder="Buscar por nombre, monodroga, laboratorio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="fv-list-meta">
              {filtered.length} medicamento{filtered.length !== 1 ? 's' : ''}
            </div>
            <div className="fv-list">
              {filtered.length === 0 ? (
                <div className="fv-list-empty">No se encontraron resultados.</div>
              ) : (
                filtered.map(med => {
                  const qty = totalStock(med);
                  const lvl = stockLevel(qty);
                  const isActive = selected?.codigo === med.codigo;
                  return (
                    <button
                      key={med.codigo}
                      className={`fv-item ${isActive ? 'fv-item--active' : ''}`}
                      onClick={() => setSelected(med)}
                    >
                      <div className="fv-item-top">
                        <span className="fv-item-name">{med.nombre}</span>
                        <span className={`fv-stock-badge ${lvl.cls}`}>{qty} uds.</span>
                      </div>
                      <div className="fv-item-sub">
                        {med.accion_terapeutica?.tipo || '—'}
                        {med.monodroga?.descripcion ? ` · ${med.monodroga.descripcion.slice(0, 36)}` : ''}
                      </div>
                      <div className="fv-item-lab">
                        <IconBuilding />
                        {med.laboratorio_produccion?.nombre || '—'}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detalle */}
          <div className="fv-detail-panel">
            {!selected ? (
              <div className="fv-detail-empty">
                <div className="fv-detail-empty-icon"><IconPill /></div>
                <div className="fv-detail-empty-title">Seleccione un medicamento</div>
                <div className="fv-detail-empty-sub">
                  Haga clic en un medicamento de la lista para visualizar su información completa.
                </div>
              </div>
            ) : (
              <div className="fv-detail-card">
                {/* Header */}
                <div className="fv-detail-header">
                  <div className="fv-detail-header-left">
                    <h2 className="fv-detail-title">{selected.nombre}</h2>
                    <div className="fv-detail-badges">
                      {selected.accion_terapeutica && (
                        <span className="fv-detail-badge fv-detail-badge--violet">
                          {selected.accion_terapeutica.tipo}
                        </span>
                      )}
                      <span className="fv-detail-badge fv-detail-badge--neutral">
                        Código #{selected.codigo}
                      </span>
                    </div>
                  </div>
                  <div className="fv-detail-header-right">
                    <div className="fv-detail-stock-label">Stock Total</div>
                    <div
                      className="fv-detail-stock-num"
                      style={{ color: stockNumColor(totalStock(selected)) }}
                    >
                      {totalStock(selected)}
                    </div>
                    <div className="fv-detail-stock-unit">unidades</div>
                  </div>
                </div>

                <div className="fv-detail-body">
                  {/* Info cards */}
                  <div className="fv-info-grid">
                    <div className="fv-info-card">
                      <div className="fv-info-card-icon"><IconFlask /></div>
                      <div className="fv-info-card-label">Monodroga</div>
                      <div className="fv-info-card-value">
                        {selected.monodroga?.descripcion || '—'}
                      </div>
                    </div>
                    <div className="fv-info-card">
                      <div className="fv-info-card-icon"><IconBuilding /></div>
                      <div className="fv-info-card-label">Laboratorio</div>
                      <div className="fv-info-card-value">
                        {selected.laboratorio_produccion?.nombre || '—'}
                      </div>
                      {selected.laboratorio_produccion?.descripcion && (
                        <div className="fv-info-card-sub">
                          {selected.laboratorio_produccion.descripcion}
                        </div>
                      )}
                    </div>
                    <div className="fv-info-card">
                      <div className="fv-info-card-icon"><IconActivity /></div>
                      <div className="fv-info-card-label">Acción Terapéutica</div>
                      <div className="fv-info-card-value">
                        {selected.accion_terapeutica?.tipo || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Descripción */}
                  {selected.descripcion && (
                    <div className="fv-description">
                      <div className="fv-description-label">Descripción</div>
                      <p className="fv-description-text">{selected.descripcion}</p>
                    </div>
                  )}

                  {/* Stock por farmacia */}
                  <div className="fv-stock-section">
                    <div className="fv-stock-section-title">
                      <IconPackage />
                      Distribución por Farmacia
                    </div>
                    {selected.stock && selected.stock.length > 0 ? (
                      <div className="fv-stock-list">
                        {selected.stock.map((s, i) => {
                          const pct = Math.min(((s.cantidad || 0) / 100) * 100, 100);
                          const barColor = s.cantidad === 0 ? '#dc2626' : s.cantidad < 20 ? '#d97706' : '#16a34a';
                          return (
                            <div key={i} className="fv-stock-item">
                              <div className="fv-stock-item-top">
                                <div>
                                  <div className="fv-stock-item-name">
                                    {s.farmacia?.nombre || `Farmacia #${s.id_farmacia}`}
                                  </div>
                                  <div className="fv-stock-item-pres">
                                    {s.presentacion?.descripcion || '—'} · {s.presentacion?.unidad || ''}
                                  </div>
                                </div>
                                <div className="fv-stock-item-qty" style={{ color: stockNumColor(s.cantidad) }}>
                                  {s.cantidad}
                                  <span className="fv-stock-item-unit">und.</span>
                                </div>
                              </div>
                              <div className="fv-stock-bar-track">
                                <div
                                  className="fv-stock-bar-fill"
                                  style={{ width: `${pct}%`, background: barColor }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="fv-stock-empty">
                        Sin stock registrado en ninguna farmacia del sistema.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab Farmacias */
        <div className="fv-farmacias-grid">
          {farmacias.length === 0 ? (
            <div className="fv-farmacias-empty">No hay farmacias registradas en el sistema.</div>
          ) : (
            farmacias.map(f => {
              const stockTotal = (f.items_stock || []).reduce((a, s) => a + (s.cantidad || 0), 0);
              return (
                <div key={f.id_farmacia} className="fv-farmacia-card">
                  <div className="fv-farmacia-card-header">
                    <div>
                      <div className="fv-farmacia-name">{f.nombre}</div>
                      <div className="fv-farmacia-meta">
                        {f.items_stock?.length || 0} tipo{f.items_stock?.length !== 1 ? 's' : ''} de medicamento
                        &nbsp;·&nbsp;
                        <span style={{ color: stockNumColor(stockTotal), fontWeight: 700 }}>
                          {stockTotal} und. totales
                        </span>
                      </div>
                    </div>
                    <span className="fv-farmacia-price">S/. {parseFloat(f.precio || 0).toFixed(2)}</span>
                  </div>
                  <div className="fv-farmacia-items">
                    {f.items_stock && f.items_stock.length > 0 ? (
                      f.items_stock.map((item, i) => (
                        <div
                          key={i}
                          className="fv-farmacia-item"
                          style={{ borderBottom: i < f.items_stock.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                        >
                          <div className="fv-farmacia-item-name">
                            {item.medicamento?.nombre || '—'}
                          </div>
                          <div className="fv-farmacia-item-detail">
                            <span>{item.presentacion?.descripcion}</span>
                            {item.presentacion?.unidad && <span>· {item.presentacion.unidad}</span>}
                            <span
                              className="fv-farmacia-item-qty"
                              style={{ color: stockNumColor(item.cantidad) }}
                            >
                              {item.cantidad} und.
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="fv-farmacia-no-items">Sin medicamentos registrados.</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
