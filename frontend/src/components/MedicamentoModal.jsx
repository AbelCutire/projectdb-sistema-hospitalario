import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function MedicamentoModal({ onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);

  // Catálogo fields
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idAccionTerapeutica, setIdAccionTerapeutica] = useState('');
  const [idMonodroga, setIdMonodroga] = useState('');
  const [codigoLaboratorio, setCodigoLaboratorio] = useState('');

  // Stock fields (optional)
  const [idFarmacia, setIdFarmacia] = useState('');
  const [codigoPresentacion, setCodigoPresentacion] = useState('');
  const [cantidad, setCantidad] = useState('');

  const [activeTab, setActiveTab] = useState('catalogo');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api('/medicamento/metadata', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMetadata(res);
      } catch (err) {
        console.error('Error cargando metadatos:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        nombre,
        descripcion,
        id_accion_terapeutica: idAccionTerapeutica,
        id_monodroga: idMonodroga,
        codigo_laboratorio: codigoLaboratorio,
      };

      if (idFarmacia && codigoPresentacion && cantidad) {
        payload.stock = {
          id_farmacia: idFarmacia,
          codigo_presentacion: codigoPresentacion,
          cantidad: cantidad
        };
      }

      await api('/medicamento', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      onSaved();
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado al intentar guardar el medicamento.');
    } finally {
      setLoading(false);
    }
  };

  if (!metadata) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: 'white', padding: 24, borderRadius: 16 }}>Cargando datos del sistema...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 500, padding: 32, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet-600)' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--slate-800)' }}>Añadir Medicamento</h2>
            <div style={{ color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: 2 }}>Registrar en el catálogo general del hospital</div>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: 12, marginBottom: 16, background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, animation: 'slideUp 0.3s ease' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--slate-200)', paddingBottom: 8 }}>
          <button 
            type="button" 
            onClick={() => setActiveTab('catalogo')}
            style={{ padding: '8px 16px', background: 'transparent', border: 'none', fontWeight: 600, color: activeTab === 'catalogo' ? 'var(--violet-600)' : 'var(--slate-400)', borderBottom: activeTab === 'catalogo' ? '2px solid var(--violet-600)' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Datos del Catálogo
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('stock')}
            style={{ padding: '8px 16px', background: 'transparent', border: 'none', fontWeight: 600, color: activeTab === 'stock' ? 'var(--emerald-600)' : 'var(--slate-400)', borderBottom: activeTab === 'stock' ? '2px solid var(--emerald-600)' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Stock Inicial (Opcional)
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: activeTab === 'catalogo' ? 'flex' : 'none', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Nombre del Medicamento</label>
              <input type="text" required className="form-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Paracetamol 500mg" />
            </div>

            <div>
              <label className="form-label">Descripción</label>
              <textarea className="form-input" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalles o indicaciones principales..." rows="2" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Acción Terapéutica</label>
                <select className="form-input" required value={idAccionTerapeutica} onChange={e => setIdAccionTerapeutica(e.target.value)}>
                  <option value="">Seleccione...</option>
                  {metadata.acciones.map(a => (
                    <option key={a.id_accion_terapeutica} value={a.id_accion_terapeutica}>{a.tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Monodroga</label>
                <select className="form-input" required value={idMonodroga} onChange={e => setIdMonodroga(e.target.value)}>
                  <option value="">Seleccione...</option>
                  {metadata.monodrogas.map(m => (
                    <option key={m.id_monodroga} value={m.id_monodroga}>{m.descripcion}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Laboratorio</label>
              <select className="form-input" required value={codigoLaboratorio} onChange={e => setCodigoLaboratorio(e.target.value)}>
                <option value="">Seleccione laboratorio...</option>
                {metadata.laboratorios.map(l => (
                  <option key={l.codigo} value={l.codigo}>{l.descripcion}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: activeTab === 'stock' ? 'flex' : 'none', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, background: 'var(--slate-50)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: 8 }}>
              Para agregar stock inmediatamente al registrar el medicamento, llena estos campos. Si solo quieres registrarlo en el catálogo, déjalos vacíos.
            </div>

            <div>
              <label className="form-label">Farmacia de Destino</label>
              <select className="form-input" value={idFarmacia} onChange={e => setIdFarmacia(e.target.value)}>
                <option value="">Ninguna (Solo catálogo)</option>
                {metadata.farmacias.map(f => (
                  <option key={f.id_farmacia} value={f.id_farmacia}>{f.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Presentación</label>
                <select className="form-input" value={codigoPresentacion} onChange={e => setCodigoPresentacion(e.target.value)}>
                  <option value="">Seleccione...</option>
                  {metadata.presentaciones.map(p => (
                    <option key={p.codigo} value={p.codigo}>{p.descripcion}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Cantidad Inicial</label>
                <input type="number" min="1" className="form-input" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '12px 0' }} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px 0' }} disabled={loading}>
              {loading ? 'Guardando...' : (activeTab === 'stock' ? 'Guardar Todo' : 'Guardar en Catálogo')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
