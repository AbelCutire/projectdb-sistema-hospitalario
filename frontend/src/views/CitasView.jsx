import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

const HORARIO_INICIO = 8;   // 8:00
const HORARIO_FIN   = 17;  // 17:00 (última cita 17:30)

/* ─────────────────────────────────────────────────────────────────────
   Utilidades
   ───────────────────────────────────────────────────────────────────── */
function generarSlotsLaborales() {
  const slots = [];
  for (let h = HORARIO_INICIO; h <= HORARIO_FIN; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < HORARIO_FIN || true) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots.filter(s => {
    const [h, m] = s.split(':').map(Number);
    return h < HORARIO_FIN || (h === HORARIO_FIN && m === 0);
  });
}

const ALL_SLOTS = generarSlotsLaborales();

function horaStr(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
}

function fechaStr(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('es-ES');
}

/* ─────────────────────────────────────────────────────────────────────
   MAIN VIEW
   ───────────────────────────────────────────────────────────────────── */
export default function CitasView({ userRole, userProfile }) {
  const [citas, setCitas]               = useState([]);
  const [doctores, setDoctores]         = useState([]);
  const [pacientes, setPacientes]       = useState([]);
  const [consultorios, setConsultorios] = useState([]);
  const [farmacia, setFarmacia]         = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [citaAtendida, setCitaAtendida] = useState(null);
  const [loading, setLoading]           = useState(true);

  const [nuevaCita, setNuevaCita] = useState({
    id_paciente: '', id_doctor: '', id_consultorio: '', fecha: '', hora: ''
  });

  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const citasData = await api('/cita', { headers });
      setCitas(citasData || []);

      if (userRole === 'Paciente' || userRole === 'Administrador') {
        // Doctores activos solamente
        const docs = await api('/doctor', { headers }).catch(() => []);
        setDoctores((docs || []).filter(d => d.empleado?.estado_laboral === 'Activo'));
        // Consultorios necesarios para asignar al agendar
        const cons = await api('/consultorio', { headers }).catch(() => []);
        setConsultorios(cons || []);
      }

      if (userRole === 'Administrador') {
        const pacs = await api('/paciente', { headers }).catch(() => []);
        setPacientes(pacs || []);
      }

      if (userRole === 'Médico Especialista') {
        const [cons, farm] = await Promise.all([
          api('/consultorio', { headers }).catch(() => []),
          api('/farmacia',    { headers }).catch(() => [])
        ]);
        setConsultorios(cons || []);
        setFarmacia(farm || []);
      }
    } catch (err) {
      console.error('Error al cargar datos de citas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [userRole]);

  /* Citas visibles según rol */
  const misCitas = useMemo(() => {
    if (userRole === 'Médico Especialista') {
      return citas.filter(c => c.id_doctor === userProfile?.id_persona);
    }
    if (userRole === 'Paciente') {
      return citas.filter(c => c.id_paciente === userProfile?.id_persona);
    }
    return citas;
  }, [citas, userRole, userProfile]);

  /* Slots disponibles — usa UTC para evitar desfase de zona */
  const horasDisponibles = useMemo(() => {
    if (!nuevaCita.id_doctor || !nuevaCita.fecha) return [];
    const ocupadas = citas
      .filter(c => {
        if (!c.fecha || !c.hora) return false;
        const fechaCita = new Date(c.fecha).toISOString().split('T')[0];
        return (
          c.id_doctor === parseInt(nuevaCita.id_doctor, 10) &&
          fechaCita === nuevaCita.fecha &&
          c.estado !== 'Cancelada'
        );
      })
      .map(c => horaStr(c.hora));

    return ALL_SLOTS.filter(s => !ocupadas.includes(s));
  }, [nuevaCita.id_doctor, nuevaCita.fecha, citas]);

  const handleAgendar = async (e) => {
    e.preventDefault();
    try {
      const id_pac = userRole === 'Paciente'
        ? userProfile?.id_persona
        : parseInt(nuevaCita.id_paciente, 10);

      if (!id_pac) {
        alert('No se pudo identificar al paciente. Intente nuevamente.');
        return;
      }

      // Asignar consultorio: admin elige, paciente toma el primero disponible
      let id_cons = nuevaCita.id_consultorio ? parseInt(nuevaCita.id_consultorio, 10) : null;
      if (!id_cons) {
        if (consultorios.length === 0) {
          alert('No hay consultorios disponibles en el sistema. Contacte al administrador.');
          return;
        }
        id_cons = consultorios[0].id_consultorio;
      }

      if (!nuevaCita.id_doctor) { alert('Seleccione un médico.'); return; }
      if (!nuevaCita.fecha)     { alert('Seleccione una fecha.'); return; }
      if (!nuevaCita.hora)      { alert('Seleccione una hora.'); return; }

      const [hh, mm] = nuevaCita.hora.split(':').map(Number);
      const horaISO  = new Date(`${nuevaCita.fecha}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00Z`).toISOString();
      const fechaISO = new Date(`${nuevaCita.fecha}T12:00:00Z`).toISOString();

      await api('/cita', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha:          fechaISO,
          hora:           horaISO,
          estado:         'Pendiente',
          id_paciente:    id_pac,
          id_doctor:      parseInt(nuevaCita.id_doctor, 10),
          id_consultorio: id_cons
        })
      });
      setShowForm(false);
      setNuevaCita({ id_paciente: '', id_doctor: '', id_consultorio: '', fecha: '', hora: '' });
      fetchData();
    } catch (err) {
      console.error('Error al agendar:', err);
      alert(err.message || 'Error al agendar la cita. Revise los datos e intente nuevamente.');
    }
  };

  const statusBadge = (estado) => {
    const map = { Completada: 'badge-green', Pendiente: 'badge-blue', Cancelada: 'badge-red', Confirmada: 'badge-cyan' };
    return <span className={`badge ${map[estado] || 'badge-slate'}`}>{estado}</span>;
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span style={{ color: 'var(--slate-400)', fontSize: '0.9rem' }}>Cargando citas...</span>
      </div>
    );
  }

  /* ── Hoy para marcar citas del día ── */
  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Citas Médicas</h1>
          <p>
            {userRole === 'Administrador'       && 'Gestión completa de citas y agendamiento para pacientes.'}
            {userRole === 'Médico Especialista' && 'Agenda del día y gestión de consultas. Atiende las pendientes.'}
            {userRole === 'Paciente'            && 'Consulta y agenda tus citas médicas.'}
          </p>
        </div>
        {(userRole === 'Paciente' || userRole === 'Administrador') && (
          <button
            className="btn-primary"
            style={{ padding: '10px 20px', borderRadius: 10, whiteSpace: 'nowrap', marginTop: 4 }}
            onClick={() => setShowForm(prev => !prev)}
          >
            {showForm ? 'Cancelar' : '+ Nueva Cita'}
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (userRole === 'Paciente' || userRole === 'Administrador') && (
        <div className="form-panel" style={{ marginBottom: 24 }}>
          <div className="form-panel-title">Agendar Nueva Cita</div>
          <form onSubmit={handleAgendar}>
            <div className="form-row">
              {userRole === 'Administrador' && (
                <div className="form-group">
                  <label className="form-label">Paciente</label>
                  <select required className="form-select"
                    value={nuevaCita.id_paciente}
                    onChange={e => setNuevaCita({ ...nuevaCita, id_paciente: e.target.value })}
                  >
                    <option value="">Seleccione paciente</option>
                    {pacientes.map(p => (
                      <option key={p.id_persona} value={p.id_persona}>
                        {p.persona?.nombre} {p.persona?.apellido} — DNI {p.persona?.dni}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Médico</label>
                <select required className="form-select"
                  value={nuevaCita.id_doctor}
                  onChange={e => setNuevaCita({ ...nuevaCita, id_doctor: e.target.value, hora: '' })}
                >
                  <option value="">Seleccione médico</option>
                  {doctores.map(doc => (
                    <option key={doc.id_persona} value={doc.id_persona}>
                      Dr. {doc.empleado?.persona?.nombre} {doc.empleado?.persona?.apellido} — {doc.especialidad?.nombre_especialidad}
                    </option>
                  ))}
                </select>
              </div>

              {userRole === 'Administrador' && (
                <div className="form-group">
                  <label className="form-label">Consultorio</label>
                  <select required className="form-select"
                    value={nuevaCita.id_consultorio}
                    onChange={e => setNuevaCita({ ...nuevaCita, id_consultorio: e.target.value })}
                  >
                    <option value="">Seleccione consultorio</option>
                    {consultorios.map(c => (
                      <option key={c.id_consultorio} value={c.id_consultorio}>
                        Cons. {c.numero} — {c.departamento?.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input type="date" required className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  value={nuevaCita.fecha}
                  onChange={e => setNuevaCita({ ...nuevaCita, fecha: e.target.value, hora: '' })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Hora {horasDisponibles.length > 0 && <span style={{ color: 'var(--emerald-600)', fontWeight: 400, textTransform: 'none' }}>· {horasDisponibles.length} disponibles</span>}
                </label>
                <select required className="form-select"
                  value={nuevaCita.hora}
                  onChange={e => setNuevaCita({ ...nuevaCita, hora: e.target.value })}
                  disabled={!nuevaCita.id_doctor || !nuevaCita.fecha}
                >
                  <option value="">
                    {!nuevaCita.id_doctor || !nuevaCita.fecha ? 'Seleccione médico y fecha primero' : 'Seleccione hora'}
                  </option>
                  {horasDisponibles.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                {nuevaCita.id_doctor && nuevaCita.fecha && horasDisponibles.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--red-500)', marginTop: 4 }}>
                    No hay horarios disponibles para ese médico en esa fecha.
                  </p>
                )}
              </div>

              <button type="submit" className="btn-confirm">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de citas */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              {userRole === 'Administrador'       ? 'Todas las Citas' :
               userRole === 'Médico Especialista' ? 'Mi Agenda' : 'Mis Citas'}
            </div>
            <div className="panel-subtitle">{misCitas.length} registros</div>
          </div>
        </div>

        {misCitas.length === 0 ? (
          <div className="empty-state"><p>No hay citas registradas.</p></div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  {userRole !== 'Paciente'             && <th>Paciente</th>}
                  {userRole !== 'Médico Especialista'  && <th>Médico</th>}
                  <th>Especialidad</th>
                  <th>Consultorio</th>
                  <th>Estado</th>
                  {userRole === 'Médico Especialista'  && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {misCitas.map(cita => {
                  const fechaCita    = cita.fecha ? new Date(cita.fecha).toISOString().split('T')[0] : null;
                  const esHoy        = fechaCita === hoy;
                  const pendiente    = cita.estado === 'Pendiente';
                  const consultorioLabel = cita.consultorio
                    ? `Cons. ${cita.consultorio.numero}${cita.consultorio.departamento?.nombre ? ' · ' + cita.consultorio.departamento.nombre : ''}`
                    : `Cons. ${cita.id_consultorio}`;

                  return (
                    <tr key={cita.id_cita} style={{ background: esHoy && pendiente ? '#f0f9ff' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="td-bold">{fechaStr(cita.fecha)}</span>
                          {esHoy && <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Hoy</span>}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {horaStr(cita.hora)}
                      </td>
                      {userRole !== 'Paciente' && (
                        <td>{cita.paciente?.persona?.nombre} {cita.paciente?.persona?.apellido}</td>
                      )}
                      {userRole !== 'Médico Especialista' && (
                        <td>Dr. {cita.doctor?.empleado?.persona?.nombre} {cita.doctor?.empleado?.persona?.apellido}</td>
                      )}
                      <td style={{ color: 'var(--slate-400)', fontSize: '0.85rem' }}>
                        {cita.doctor?.especialidad?.nombre_especialidad || '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{consultorioLabel}</td>
                      <td>{statusBadge(cita.estado)}</td>
                      {userRole === 'Médico Especialista' && (
                        <td>
                          {pendiente ? (
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
                              onClick={() => setCitaAtendida(cita)}
                            >
                              Atender
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal diagnóstico */}
      {citaAtendida && (
        <DiagnosticoModal
          cita={citaAtendida}
          farmacia={farmacia}
          userProfile={userProfile}
          onClose={() => setCitaAtendida(null)}
          onSaved={() => { setCitaAtendida(null); fetchData(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   MODAL: DIAGNÓSTICO → TRATAMIENTO → RECETA (2 pasos)
   ───────────────────────────────────────────────────────────────────── */
function DiagnosticoModal({ cita, farmacia, userProfile, onClose, onSaved }) {
  const [step, setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [diagData, setDiagData] = useState({
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  const [tratData, setTratData] = useState({
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: ''
  });

  const [medicamentos, setMedicamentos] = useState([
    { id_farmacia: '', dosis: '', frecuencia: '', duracion: '' }
  ]);

  const [savedDiagId, setSavedDiagId] = useState(null);

  const agregarMed    = () => setMedicamentos(p => [...p, { id_farmacia: '', dosis: '', frecuencia: '', duracion: '' }]);
  const quitarMed     = (i) => setMedicamentos(p => p.filter((_, idx) => idx !== i));
  const updateMed     = (i, f, v) => setMedicamentos(p => p.map((m, idx) => idx === i ? { ...m, [f]: v } : m));

  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const guardarDiag = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const diag = await api('/diagnostico', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          descripcion: diagData.descripcion,
          fecha:       diagData.fecha,
          id_paciente: cita.id_paciente,
          id_cita:     cita.id_cita
        })
      });
      setSavedDiagId(diag.id_diagnostico);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Error al guardar diagnóstico.');
    } finally {
      setSaving(false);
    }
  };

  const guardarTratReceta = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      // Tratamiento
      const trat = await api('/tratamiento', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fecha_inicio:   tratData.fecha_inicio,
          fecha_fin:      tratData.fecha_fin,
          id_diagnostico: savedDiagId
        })
      });

      // Receta solo si hay medicamentos válidos
      const detalles = medicamentos.filter(m => m.id_farmacia && m.dosis && m.frecuencia && m.duracion);
      if (detalles.length > 0) {
        await api('/receta', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fecha_emision:  tratData.fecha_inicio,
            id_tratamiento: trat.id_tratamiento,
            detalles
          })
        });
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Error al guardar tratamiento o receta.');
    } finally {
      setSaving(false);
    }
  };

  const pacNombre = `${cita.paciente?.persona?.nombre || ''} ${cita.paciente?.persona?.apellido || ''}`.trim();
  const fechaCita = cita.fecha
    ? new Date(cita.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)', zIndex: 100 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(580px, 100vw)',
        background: '#fff', zIndex: 101, overflowY: 'auto',
        boxShadow: '-20px 0 60px rgba(15,23,42,0.15)', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-900)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                Atender Consulta
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>{pacNombre}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {fechaCita} · {horaStr(cita.hora)} · DNI: {cita.paciente?.persona?.dni || '—'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          {/* Steps */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {[{ n: 1, label: 'Diagnóstico' }, { n: 2, label: 'Tratamiento y Receta' }].map(s => (
              <div key={s.n} style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', textAlign: 'center',
                fontWeight: step >= s.n ? 700 : 500,
                background: step >= s.n ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
                color: step >= s.n ? '#93c5fd' : 'rgba(255,255,255,0.3)',
                border: step === s.n ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent'
              }}>
                {s.n}. {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '32px' }}>

          {/* PASO 1: DIAGNÓSTICO */}
          {step === 1 && (
            <form onSubmit={guardarDiag}>
              <div style={{ marginBottom: 24 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Fecha del Diagnóstico</div>
                <input type="date" required className="form-input" style={{ width: '100%' }}
                  value={diagData.fecha}
                  onChange={e => setDiagData(p => ({ ...p, fecha: e.target.value }))}
                />
              </div>
              <div style={{ marginBottom: 28 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Descripción del Diagnóstico</div>
                <textarea
                  required rows={6}
                  placeholder="Describa el diagnóstico clínico del paciente..."
                  value={diagData.descripcion}
                  onChange={e => setDiagData(p => ({ ...p, descripcion: e.target.value }))}
                  style={{
                    width: '100%', borderRadius: 10, border: '1.5px solid var(--slate-200)',
                    padding: '12px 14px', fontSize: '0.9rem', resize: 'vertical',
                    fontFamily: 'inherit', color: 'var(--slate-800)', background: 'var(--slate-50)',
                    outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
                  onBlur={e => e.target.style.borderColor = 'var(--slate-200)'}
                />
              </div>
              {error && <p style={{ color: 'var(--red-500)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: 13, borderRadius: 10 }} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Diagnóstico y Continuar'}
              </button>
            </form>
          )}

          {/* PASO 2: TRATAMIENTO + RECETA */}
          {step === 2 && (
            <form onSubmit={guardarTratReceta}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: 14 }}>Período de Tratamiento</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <div className="form-label" style={{ marginBottom: 6 }}>Fecha Inicio</div>
                    <input type="date" required className="form-input" style={{ width: '100%' }}
                      value={tratData.fecha_inicio}
                      onChange={e => setTratData(p => ({ ...p, fecha_inicio: e.target.value }))}
                    />
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: 6 }}>Fecha Fin</div>
                    <input type="date" required className="form-input" style={{ width: '100%' }}
                      min={tratData.fecha_inicio}
                      value={tratData.fecha_fin}
                      onChange={e => setTratData(p => ({ ...p, fecha_fin: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: 22, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)' }}>Medicamentos Prescritos</div>
                  <button type="button" className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={agregarMed}>+ Agregar</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {medicamentos.map((m, idx) => (
                    <div key={idx} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '16px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          Medicamento {idx + 1}
                        </span>
                        {medicamentos.length > 1 && (
                          <button type="button" onClick={() => quitarMed(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--red-400)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                            Quitar
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div className="form-label" style={{ marginBottom: 4 }}>Fármaco</div>
                          <select className="form-select" style={{ width: '100%' }}
                            value={m.id_farmacia}
                            onChange={e => updateMed(idx, 'id_farmacia', e.target.value)}
                          >
                            <option value="">Seleccione fármaco</option>
                            {farmacia.map(f => (
                              <option key={f.id_farmacia} value={f.id_farmacia}>
                                {f.nombre} (Stock: {f.stock})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="form-label" style={{ marginBottom: 4 }}>Dosis</div>
                          <input className="form-input" style={{ width: '100%' }} placeholder="Ej: 500mg"
                            value={m.dosis} onChange={e => updateMed(idx, 'dosis', e.target.value)} />
                        </div>
                        <div>
                          <div className="form-label" style={{ marginBottom: 4 }}>Frecuencia</div>
                          <input className="form-input" style={{ width: '100%' }} placeholder="Ej: Cada 8 horas"
                            value={m.frecuencia} onChange={e => updateMed(idx, 'frecuencia', e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div className="form-label" style={{ marginBottom: 4 }}>Duración</div>
                          <input className="form-input" style={{ width: '100%' }} placeholder="Ej: 7 días"
                            value={m.duracion} onChange={e => updateMed(idx, 'duracion', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p style={{ color: 'var(--red-500)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, padding: 12, borderRadius: 10 }} onClick={() => setStep(1)} disabled={saving}>
                  Volver
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, padding: 12, borderRadius: 10 }} disabled={saving}>
                  {saving ? 'Guardando...' : 'Completar Consulta'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
