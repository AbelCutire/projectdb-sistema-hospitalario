import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ContratoModal({ persona, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [salario, setSalario] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estado, setEstado] = useState('Activo');

  useEffect(() => {
    if (persona?.empleado?.contrato) {
      const c = persona.empleado.contrato;
      setSalario(c.salario || '');
      setFechaInicio(c.fecha_inicio ? c.fecha_inicio.split('T')[0] : '');
      setFechaFin(c.fecha_fin ? c.fecha_fin.split('T')[0] : '');
      setEstado(c.estado || 'Activo');
    } else if (persona?.empleado) {
      setEstado(persona.empleado.estado_laboral || 'Activo');
      setFechaInicio(persona.empleado.fecha_ingreso ? persona.empleado.fecha_ingreso.split('T')[0] : '');
    }
  }, [persona]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api(`/empleado/${persona.id_persona}/contrato`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          salario,
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
          estado
        })
      });
      onSaved();
    } catch (err) {
      alert(err.message || 'Error al actualizar el contrato');
    } finally {
      setLoading(false);
    }
  };

  if (!persona) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 450, padding: 32, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-600)' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--slate-800)' }}>Nómina y Contrato</h2>
            <div style={{ color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: 2 }}>{persona.nombre} {persona.apellido}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Salario Mensual (USD)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontWeight: 600 }}>$</span>
              <input type="number" step="0.01" required className="form-input" value={salario} onChange={e => setSalario(e.target.value)} style={{ paddingLeft: 32 }} placeholder="0.00" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Fecha Inicio</label>
              <input type="date" required className="form-input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Fecha Fin</label>
              <input type="date" required className="form-input" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Estado Laboral</label>
            <select className="form-input" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Suspendido">Suspendido</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '12px 0' }} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px 0' }} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Contrato'}</button>
          </div>
        </form>

      </div>
    </div>
  );
}
