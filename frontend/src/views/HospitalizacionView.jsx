import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

export default function HospitalizacionView({ userRole }) {
  const [ingresos, setIngresos] = useState([]);
  const [salas, setSalas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalInternar, setModalInternar] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [selectedCamilla, setSelectedCamilla] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const [confirmAlta, setConfirmAlta] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [ingRes, salasRes, pacRes] = await Promise.all([
        api('/hospitalizacion', { headers }).catch(() => []),
        api('/hospitalizacion/salas', { headers }).catch(() => []),
        api('/paciente', { headers }).catch(() => [])
      ]);

      setIngresos(ingRes || []);
      setSalas(salasRes || []);
      setPacientes(pacRes || []);
    } catch (err) {
      toast.error('Error al cargar datos de hospitalización.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const internadosActuales = useMemo(() => {
    // Filtramos los que aún no tienen alta, o si la tienen, que sea futura (por defecto pusimos 1 año adelante)
    const hoy = new Date();
    return ingresos.filter(i => new Date(i.fecha_alta) > hoy);
  }, [ingresos]);

  const handleInternar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await api('/hospitalizacion', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id_paciente: selectedPaciente,
          id_camilla: selectedCamilla,
          fecha_ingreso: fechaIngreso
        })
      });
      toast.success('Paciente internado exitosamente.');
      setModalInternar(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Error al internar paciente.');
    } finally {
      setSaving(false);
    }
  };

  const executeAlta = async () => {
    if (!confirmAlta) return;
    try {
      const token = localStorage.getItem('token');
      await api(`/hospitalizacion/${confirmAlta.id_ingreso_hospitalizacion}/alta`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fecha_alta: new Date().toISOString() })
      });
      toast.success('El paciente ha sido dado de alta.');
      setConfirmAlta(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Error al dar de alta.');
    }
  };

  const camillasDisponibles = useMemo(() => {
    const list = [];
    salas.forEach(sala => {
      sala.camilla?.forEach(c => {
        if (c.estado === 'Disponible') {
          list.push({ ...c, nombre_sala: sala.nombre });
        }
      });
    });
    return list;
  }, [salas]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span style={{ color: 'var(--slate-400)', fontSize: '0.9rem' }}>Cargando pabellón...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Control de Hospitalización</h1>
          <p>Módulo de Enfermería: Gestión de camas, ingresos y altas médicas.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalInternar(true)}>+ Internar Paciente</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div className="stat-card">
          <div className="stat-label">Camas Ocupadas</div>
          <div className="stat-value">{internadosActuales.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Camas Disponibles</div>
          <div className="stat-value" style={{ color: 'var(--emerald-600)' }}>{camillasDisponibles.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Salas Activas</div>
          <div className="stat-value" style={{ color: 'var(--blue-600)' }}>{salas.length}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Pacientes Internados Actualmente</div>
        </div>

        {internadosActuales.length === 0 ? (
          <div className="empty-state">
            <p>No hay pacientes internados en este momento.</p>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Fecha de Ingreso</th>
                  <th>Ubicación (Sala / Camilla)</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {internadosActuales.map(ing => (
                  <tr key={ing.id_ingreso_hospitalizacion}>
                    <td>
                      <div className="td-bold">{ing.paciente?.persona?.nombre} {ing.paciente?.persona?.apellido}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>DNI: {ing.paciente?.persona?.dni}</div>
                    </td>
                    <td>{new Date(ing.fecha_ingreso).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="badge badge-blue">{ing.camilla?.sala?.nombre}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)', fontWeight: 600 }}>Cama {ing.camilla?.id_camilla}</span>
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, color: 'var(--emerald-600)', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }}
                        onClick={() => setConfirmAlta(ing)}
                      >
                        Dar de Alta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalInternar && (
        <>
          <div onClick={() => setModalInternar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 18, width: 'min(500px, 90vw)', boxShadow: '0 20px 60px rgba(15,23,42,0.15)', zIndex: 201, overflow: 'hidden' }}>
            <div style={{ background: 'var(--blue-600)', padding: '24px 28px', color: '#fff' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Internar Nuevo Paciente</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Asigne una cama disponible en el pabellón.</div>
            </div>
            <form onSubmit={handleInternar} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Paciente a Internar</label>
                <select className="form-input" required value={selectedPaciente} onChange={e => setSelectedPaciente(e.target.value)}>
                  <option value="">Seleccione un paciente</option>
                  {pacientes.map(p => (
                    <option key={p.id_persona} value={p.id_persona}>{p.persona?.nombre} {p.persona?.apellido} (DNI: {p.persona?.dni})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Ubicación (Camilla Disponible)</label>
                <select className="form-input" required value={selectedCamilla} onChange={e => setSelectedCamilla(e.target.value)}>
                  <option value="">Seleccione una cama</option>
                  {camillasDisponibles.map(c => (
                    <option key={c.id_camilla} value={c.id_camilla}>{c.nombre_sala} - Cama {c.id_camilla}</option>
                  ))}
                </select>
                {camillasDisponibles.length === 0 && (
                  <p style={{ color: 'var(--red-500)', fontSize: '0.8rem', marginTop: 4 }}>No hay camas disponibles en este momento.</p>
                )}
              </div>

              <div>
                <label className="form-label">Fecha de Ingreso</label>
                <input type="date" required className="form-input" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, padding: 11 }} onClick={() => setModalInternar(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: 11 }} disabled={saving || camillasDisponibles.length === 0}>
                  {saving ? 'Registrando...' : 'Confirmar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmAlta}
        title="Dar de Alta"
        message={`¿Está seguro de que desea dar de alta al paciente ${confirmAlta?.paciente?.persona?.nombre}? \nEsta acción liberará inmediatamente la Cama ${confirmAlta?.camilla?.id_camilla}.`}
        confirmText="Sí, Dar de Alta"
        cancelText="Cancelar"
        onConfirm={executeAlta}
        onCancel={() => setConfirmAlta(null)}
      />
    </div>
  );
}
