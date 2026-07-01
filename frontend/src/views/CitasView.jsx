import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import DetallesPersonaModal from '../components/DetallesPersonaModal';

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
  const d = new Date(isoStr);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
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
  
  // Custom modals state
  const [citaToCancel, setCitaToCancel] = useState(null);
  const [isCanceling, setIsCanceling]   = useState(false);
  const [alertMsg, setAlertMsg]         = useState({ show: false, message: '', type: 'success' });
  const [detallesModalId, setDetallesModalId] = useState(null);

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
          api('/medicamento/farmacias', { headers }).catch(() => [])
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
      setNuevaCita({ id_paciente: '', id_doctor: '', id_consultorio: '', fecha: '', hora: '' });
      fetchData();
    } catch (err) {
      console.error('Error al agendar:', err);
      setAlertMsg({ show: true, message: err.message || 'Error al agendar la cita. Revise los datos e intente nuevamente.', type: 'error' });
    }
  };

  const handleCancelarCita = (cita) => {
    // Abrir el modal personalizado
    setCitaToCancel(cita);
  };

  const confirmCancelarCita = async () => {
    if (!citaToCancel) return;
    setIsCanceling(true);

    try {
      await api(`/cita/${citaToCancel.id_cita}/cancelar`, {
        method: 'PUT',
        headers
      });
      setAlertMsg({ show: true, message: 'Cita cancelada con éxito.', type: 'success' });
      fetchData();
    } catch (err) {
      console.error('Error al cancelar:', err);
      setAlertMsg({ show: true, message: err.message || 'Error al cancelar la cita. Es posible que haya expirado el límite de 24 horas.', type: 'error' });
    } finally {
      setIsCanceling(false);
      setCitaToCancel(null);
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
          <div className="empty-state">
            <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--slate-700)' }}>No hay citas médicas registradas actualmente.</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-500)', marginTop: 8, maxWidth: 600, lineHeight: 1.5 }}>
              {userRole === 'Administrador' 
                ? 'Este módulo sirve para que los administradores agenden citas (asignando un doctor, paciente y consultorio) y gestionen la cola de atención del hospital.'
                : userRole === 'Médico Especialista'
                ? 'Aquí aparecerán los pacientes que han reservado una cita contigo para que puedas iniciar su atención y recetar medicamentos.'
                : 'Aquí puedes solicitar una nueva cita médica y revisar tus citas próximas.'}
            </p>
          </div>
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
                  <th>Acción</th>
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
                        <td>
                          <button
                            className="btn-link"
                            style={{ padding: 0, color: 'var(--blue-600)', fontWeight: 600, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => setDetallesModalId(cita.paciente?.id_persona)}
                            title="Ver expediente del paciente"
                          >
                            {cita.paciente?.persona?.nombre} {cita.paciente?.persona?.apellido}
                          </button>
                        </td>
                      )}
                      {userRole !== 'Médico Especialista' && (
                        <td>Dr. {cita.doctor?.empleado?.persona?.nombre} {cita.doctor?.empleado?.persona?.apellido}</td>
                      )}
                      <td style={{ color: 'var(--slate-400)', fontSize: '0.85rem' }}>
                        {cita.doctor?.especialidad?.nombre_especialidad || '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{consultorioLabel}</td>
                      <td>{statusBadge(cita.estado)}</td>
                      <td>
                        {userRole === 'Médico Especialista' ? (
                          pendiente ? (
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
                              onClick={() => setCitaAtendida(cita)}
                            >
                              Atender
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>—</span>
                          )
                        ) : (
                          pendiente ? (
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8, color: 'var(--red-600)', borderColor: 'var(--red-200)', background: 'var(--red-50)' }}
                              onClick={() => handleCancelarCita(cita)}
                            >
                              Cancelar
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>—</span>
                          )
                        )}
                      </td>
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

      {/* Modal Cancelación */}
      {citaToCancel && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }} onClick={() => !isCanceling && setCitaToCancel(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', padding: '32px', borderRadius: '16px', zIndex: 1001,
            width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--slate-800)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--red-100)', color: 'var(--red-600)', fontSize: '1.2rem' }}>⚠️</span>
              Cancelar Cita
            </h3>
            <p style={{ color: 'var(--slate-600)', marginBottom: '24px', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas cancelar la cita del <strong>{fechaStr(citaToCancel.fecha)}</strong> a las <strong>{horaStr(citaToCancel.hora)}</strong>?<br/><br/>
              <span style={{ fontSize: '0.85rem', color: 'var(--red-500)' }}>Recuerda: Solo se puede cancelar si faltan 24 horas o más para la consulta.</span>
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setCitaToCancel(null)} 
                disabled={isCanceling}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--slate-300)', background: '#fff', color: 'var(--slate-700)', cursor: isCanceling ? 'not-allowed' : 'pointer', fontWeight: 600, flex: 1 }}
              >
                Volver
              </button>
              <button 
                onClick={confirmCancelarCita} 
                disabled={isCanceling}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--red-600)', color: '#fff', cursor: isCanceling ? 'not-allowed' : 'pointer', fontWeight: 600, flex: 1 }}
              >
                {isCanceling ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Detalles Persona */}
      {detallesModalId && (
        <DetallesPersonaModal
          personaId={detallesModalId}
          onClose={() => setDetallesModalId(null)}
          userRole={userRole}
          userProfile={userProfile}
        />
      )}

      {/* Alerta tipo Toast */}
      {alertMsg.show && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: alertMsg.type === 'error' ? 'var(--red-600)' : 'var(--emerald-600)',
          color: '#fff', padding: '16px 24px', borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '400px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <span style={{ fontSize: '1.2rem' }}>{alertMsg.type === 'error' ? '❌' : '✅'}</span>
          <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.4 }}>{alertMsg.message}</div>
          <button onClick={() => setAlertMsg({ show: false, message: '', type: 'success' })} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', opacity: 0.8 }}>✕</button>
        </div>
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
    { id_farmacia: '', nombre_medicamento: '', dosis: '', frecuencia: '', duracion: '' }
  ]);

  const [savedDiagId, setSavedDiagId] = useState(null);

  const agregarMed    = () => setMedicamentos(p => [...p, { id_farmacia: '', nombre_medicamento: '', dosis: '', frecuencia: '', duracion: '' }]);
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
      const detalles = medicamentos
        .filter(m => m.id_farmacia && m.nombre_medicamento && m.dosis && m.frecuencia && m.duracion)
        .map(m => ({
          id_farmacia: parseInt(m.id_farmacia, 10),
          dosis: `${m.nombre_medicamento} | ${m.dosis}`,
          frecuencia: m.frecuencia,
          duracion: m.duracion
        }));

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div className="form-label">Descripción del Diagnóstico</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>(Incluya aquí recomendaciones o tratamientos no farmacológicos)</span>
                </div>
                <textarea
                  required rows={6}
                  placeholder="Ej: El paciente presenta X. Se recomienda reposo por 3 días y fisioterapia..."
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)' }}>Medicamentos Prescritos (Opcional)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      Si el tratamiento no requiere medicamentos, déjelo vacío.
                    </div>
                  </div>
                  <button type="button" className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={agregarMed}>+ Agregar</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {medicamentos.length === 0 && (
                    <div style={{ padding: 16, textAlign: 'center', background: 'var(--slate-50)', borderRadius: 10, border: '1px dashed var(--slate-200)', color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                      No se emitirá ninguna receta médica.
                    </div>
                  )}
                  {medicamentos.map((m, idx) => (
                    <div key={idx} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '16px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          Medicamento {idx + 1}
                        </span>
                        <button type="button" onClick={() => quitarMed(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--red-400)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                          Quitar
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div className="form-label" style={{ marginBottom: 4 }}>Farmacia</div>
                            <select className="form-select" style={{ width: '100%' }}
                              value={m.id_farmacia}
                              onChange={e => {
                                updateMed(idx, 'id_farmacia', e.target.value);
                                updateMed(idx, 'nombre_medicamento', '');
                              }}
                            >
                              <option value="">Seleccione farmacia</option>
                              {farmacia.map(f => (
                                <option key={f.id_farmacia} value={f.id_farmacia}>
                                  {f.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="form-label" style={{ marginBottom: 4 }}>Medicamento</div>
                            <select className="form-select" style={{ width: '100%' }}
                              value={m.nombre_medicamento}
                              onChange={e => updateMed(idx, 'nombre_medicamento', e.target.value)}
                              disabled={!m.id_farmacia}
                            >
                              <option value="">Seleccione medicamento</option>
                              {farmacia.find(f => String(f.id_farmacia) === String(m.id_farmacia))?.items_stock?.map((s, si) => (
                                <option key={si} value={s.medicamento?.nombre}>
                                  {s.medicamento?.nombre} (Stock: {s.cantidad})
                                </option>
                              ))}
                            </select>
                          </div>
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
