import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ClinicoView({ userRole, userProfile }) {
  const [historial, setHistorial]       = useState(null);
  const [historiales, setHistoriales]   = useState([]);
  const [solicitudes, setSolicitudes]   = useState([]);
  const [mySolicitudes, setMySolicitudes] = useState([]);
  const [selected, setSelected]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [showSolForm, setShowSolForm]   = useState(false);
  const [solForm, setSolForm]           = useState({ id_paciente: '', motivo: '' });
  const [pacientes, setPacientes]       = useState([]);
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState('');

  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    load();
  }, [userRole, userProfile]);

  const load = async () => {
    setLoading(true);
    try {
      if (userRole === 'Paciente') {
        if (!userProfile?.id_persona) return;
        const data = await api(`/historial/${userProfile.id_persona}`, { headers }).catch(() => null);
        setHistorial(data);

      } else if (userRole === 'Médico Especialista') {
        // Doctor: ver sus solicitudes + historiales aprobados
        const [sols, pacs] = await Promise.all([
          api(`/solicitud/doctor/${userProfile?.id_usuario}`, { headers }).catch(() => []),
          api('/paciente', { headers }).catch(() => [])
        ]);
        setMySolicitudes(sols || []);
        setPacientes(pacs || []);

      } else {
        // Admin / Enfermería: ver todos los historiales + solicitudes pendientes
        const [hists, sols] = await Promise.all([
          api('/historial', { headers }).catch(() => []),
          api('/solicitud', { headers }).catch(() => [])
        ]);
        setHistoriales(hists || []);
        setSolicitudes(sols || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorialCompleto = async (id_paciente) => {
    const data = await api(`/historial/${id_paciente}`, { headers });
    setSelected(data);
  };

  const handleSolicitar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api('/solicitud', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id_doctor:   userProfile.id_usuario,
          id_paciente: parseInt(solForm.id_paciente, 10),
          motivo:      solForm.motivo
        })
      });
      setMsg('Solicitud enviada. El administrador la revisará próximamente.');
      setSolForm({ id_paciente: '', motivo: '' });
      setShowSolForm(false);
      load();
    } catch (err) {
      setMsg(err.message || 'Error al enviar solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const handleResponder = async (id_solicitud, estado) => {
    try {
      await api(`/solicitud/${id_solicitud}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ estado, id_admin: userProfile?.id_usuario })
      });
      load();
    } catch (err) {
      alert('Error al responder solicitud.');
    }
  };

  const filtrados = historiales.filter(h => {
    const nombre = `${h.paciente?.persona?.nombre || ''} ${h.paciente?.persona?.apellido || ''}`.toLowerCase();
    const dni    = String(h.paciente?.persona?.dni || '').toLowerCase();
    return nombre.includes(searchTerm.toLowerCase()) || dni.includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <span style={{ color: 'var(--slate-400)', fontSize: '0.9rem' }}>Cargando historial clínico...</span>
    </div>
  );

  /* ── PACIENTE ── */
  if (userRole === 'Paciente') {
    return (
      <div>
        <div className="page-header">
          <h1>Mi Historial Clínico</h1>
          <p>Registro completo de diagnósticos, tratamientos y medicamentos prescritos.</p>
        </div>
        {!historial ? (
          <div className="panel">
            <div className="empty-state">
              <p>No tienes historial clínico registrado. Se creará automáticamente al registrar tu primer diagnóstico.</p>
            </div>
          </div>
        ) : (
          <HistorialDetalle historial={historial} />
        )}
      </div>
    );
  }

  /* ── MÉDICO ESPECIALISTA ── */
  if (userRole === 'Médico Especialista') {
    const aprobados = mySolicitudes.filter(s => s.estado === 'Aprobada');
    const pendientes = mySolicitudes.filter(s => s.estado === 'Pendiente');

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1>Historial Clínico</h1>
            <p>Visualiza el historial de pacientes con acceso aprobado por el administrador.</p>
          </div>
          <button
            className="btn-primary"
            style={{ padding: '10px 20px', borderRadius: 10, whiteSpace: 'nowrap', marginTop: 4 }}
            onClick={() => setShowSolForm(p => !p)}
          >
            {showSolForm ? 'Cancelar' : '+ Solicitar Acceso'}
          </button>
        </div>

        {/* Formulario de solicitud */}
        {showSolForm && (
          <div className="form-panel" style={{ marginBottom: 24 }}>
            <div className="form-panel-title">Solicitud de Acceso al Historial</div>
            <form onSubmit={handleSolicitar}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Paciente</label>
                  <select
                    required className="form-select"
                    value={solForm.id_paciente}
                    onChange={e => setSolForm(p => ({ ...p, id_paciente: e.target.value }))}
                  >
                    <option value="">Seleccione paciente</option>
                    {pacientes.map(p => (
                      <option key={p.id_persona} value={p.id_persona}>
                        {p.persona?.nombre} {p.persona?.apellido} — DNI: {p.persona?.dni}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Motivo clínico</label>
                  <input
                    required className="form-input"
                    placeholder="Indique el motivo médico de la solicitud..."
                    value={solForm.motivo}
                    onChange={e => setSolForm(p => ({ ...p, motivo: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn-confirm" disabled={saving}>
                  {saving ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
            {msg && <p style={{ marginTop: 12, fontSize: '0.875rem', color: msg.includes('Error') ? 'var(--red-500)' : 'var(--emerald-600)' }}>{msg}</p>}
          </div>
        )}

        {/* Si hay uno seleccionado */}
        {selected ? (
          <>
            <button className="btn-secondary" style={{ marginBottom: 20, padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem' }} onClick={() => setSelected(null)}>
              ← Volver
            </button>
            <HistorialDetalle historial={selected} />
          </>
        ) : (
          <>
            {/* Solicitudes pendientes */}
            {pendientes.length > 0 && (
              <div className="panel" style={{ marginBottom: 20 }}>
                <div className="panel-header">
                  <div className="panel-title">Solicitudes Pendientes</div>
                  <span className="badge badge-amber">{pendientes.length}</span>
                </div>
                {pendientes.map(s => (
                  <div key={s.id_solicitud} className="data-row">
                    <div>
                      <div className="data-row-label">{s.paciente?.persona?.nombre} {s.paciente?.persona?.apellido}</div>
                      <div className="data-row-sub">En espera de aprobación · {new Date(s.fecha_sol).toLocaleDateString('es-ES')}</div>
                    </div>
                    <span className="badge badge-amber">Pendiente</span>
                  </div>
                ))}
              </div>
            )}

            {/* Historiales aprobados */}
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Pacientes con Acceso Aprobado</div>
                  <div className="panel-subtitle">Solo puedes ver el historial de estos pacientes</div>
                </div>
                <span className="badge badge-green">{aprobados.length}</span>
              </div>
              {aprobados.length === 0 ? (
                <div className="empty-state">
                  <p>No tienes acceso aprobado a ningún historial. Solicita acceso al administrador.</p>
                </div>
              ) : (
                aprobados.map(s => (
                  <div key={s.id_solicitud} className="data-row">
                    <div>
                      <div className="data-row-label">{s.paciente?.persona?.nombre} {s.paciente?.persona?.apellido}</div>
                      <div className="data-row-sub">DNI: {s.paciente?.persona?.dni || '—'} · Acceso aprobado</div>
                    </div>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
                      onClick={() => fetchHistorialCompleto(s.id_paciente)}
                    >
                      Ver Historial
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── ADMIN / ENFERMERÍA ── */
  const pendientesAdmin = solicitudes.filter(s => s.estado === 'Pendiente');

  return (
    <div>
      <div className="page-header">
        <h1>Historial Clínico</h1>
        <p>Gestiona los historiales y las solicitudes de acceso del personal médico.</p>
      </div>

      {/* Solicitudes pendientes del admin */}
      {userRole === 'Administrador' && pendientesAdmin.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <div>
              <div className="panel-title">Solicitudes de Acceso Pendientes</div>
              <div className="panel-subtitle">Revisa y aprueba o rechaza cada solicitud</div>
            </div>
            <span className="badge badge-amber">{pendientesAdmin.length} pendientes</span>
          </div>
          {pendientesAdmin.map(s => (
            <div key={s.id_solicitud} className="data-row" style={{ alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="data-row-label">
                  {s.doctor?.persona?.nombre} {s.doctor?.persona?.apellido}
                  <span style={{ fontWeight: 400, color: 'var(--slate-400)', marginLeft: 6 }}>solicita ver a</span>
                  {' '}{s.paciente?.persona?.nombre} {s.paciente?.persona?.apellido}
                </div>
                <div className="data-row-sub" style={{ marginTop: 4 }}>
                  Motivo: {s.motivo}
                </div>
                <div className="data-row-sub">{new Date(s.fecha_sol).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8, color: 'var(--red-500)', borderColor: 'var(--red-500)' }}
                  onClick={() => handleResponder(s.id_solicitud, 'Rechazada')}
                >
                  Rechazar
                </button>
                <button
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
                  onClick={() => handleResponder(s.id_solicitud, 'Aprobada')}
                >
                  Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Listado de historiales */}
      {selected ? (
        <>
          <button className="btn-secondary" style={{ marginBottom: 20, padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem' }} onClick={() => setSelected(null)}>
            ← Volver al listado
          </button>
          <HistorialDetalle historial={selected} />
        </>
      ) : (
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Pacientes con Historial Clínico</div>
              <div className="panel-subtitle">{filtrados.length} registros</div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <input
              type="text" className="form-input" style={{ width: '100%', maxWidth: 400 }}
              placeholder="Buscar por nombre o DNI..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {filtrados.length === 0 ? (
            <div className="empty-state"><p>No se encontraron registros.</p></div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>DNI</th>
                    <th>Fecha Creación</th>
                    <th>Diagnósticos</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(h => {
                    const nombre = `${h.paciente?.persona?.nombre || ''} ${h.paciente?.persona?.apellido || ''}`.trim();
                    const initials = nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
                    return (
                      <tr key={h.id_historiaclinica}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="persona-card-avatar">{initials}</div>
                            <span className="td-bold">{nombre}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{h.paciente?.persona?.dni || '—'}</td>
                        <td>{h.fecha_creacion ? new Date(h.fecha_creacion).toLocaleDateString('es-ES') : '—'}</td>
                        <td><span className="badge badge-blue">{h.diagnostico?.length || 0}</span></td>
                        <td>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8 }}
                            onClick={() => fetchHistorialCompleto(h.paciente.id_persona)}
                          >
                            Ver Historial
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   COMPONENTE: DETALLE DEL HISTORIAL CLÍNICO
   ───────────────────────────────────────────────────────────────────── */
function HistorialDetalle({ historial }) {
  const [openIdx, setOpenIdx] = useState(0);
  const nombre = `${historial.paciente?.persona?.nombre || ''} ${historial.paciente?.persona?.apellido || ''}`.trim();
  const diags  = historial.diagnostico || [];

  return (
    <div>
      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="profile-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem' }}>
            {nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-800)' }}>{nombre}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--slate-400)', marginTop: 2 }}>
              DNI: {historial.paciente?.persona?.dni || '—'}
              {historial.paciente?.grupo_sanguineo && ` · Grupo: ${historial.paciente.grupo_sanguineo}`}
              {historial.paciente?.alergias        && ` · Alergias: ${historial.paciente.alergias}`}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)', marginTop: 2 }}>
              Historial desde {historial.fecha_creacion ? new Date(historial.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            </div>
          </div>
        </div>
      </div>

      {diags.length === 0 ? (
        <div className="panel"><div className="empty-state"><p>Sin diagnósticos registrados.</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {diags.map((diag, idx) => {
            const isOpen = openIdx === idx;
            const fechaDiag = diag.fecha ? new Date(diag.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
            const doctor    = diag.cita?.doctor;
            const docNombre = doctor ? `Dr. ${doctor.empleado?.persona?.nombre || ''} ${doctor.empleado?.persona?.apellido || ''}` : '—';
            return (
              <div key={diag.id_diagnostico} className="panel" style={{ cursor: 'pointer' }}>
                <div onClick={() => setOpenIdx(isOpen ? -1 : idx)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{fechaDiag}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', lineHeight: 1.4 }}>{diag.descripcion}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: 4 }}>{docNombre} · {doctor?.especialidad?.nombre_especialidad || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="badge badge-blue">{diag.tratamiento?.length || 0} tratamientos</span>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--slate-500)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--slate-100)', paddingTop: 20 }}>
                    {(!diag.tratamiento || diag.tratamiento.length === 0) ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--slate-400)' }}>Sin tratamiento registrado.</p>
                    ) : diag.tratamiento.map(trat => {
                      const fi = trat.fecha_inicio ? new Date(trat.fecha_inicio).toLocaleDateString('es-ES') : '—';
                      const ff = trat.fecha_fin    ? new Date(trat.fecha_fin).toLocaleDateString('es-ES')    : '—';
                      return (
                        <div key={trat.id_tratamiento} style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span className="badge badge-emerald">Tratamiento</span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)' }}>{fi} → {ff}</span>
                          </div>
                          {trat.receta?.length > 0 ? trat.receta.map(rec => (
                            <div key={rec.id_receta}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                                Receta · {rec.fecha_emision ? new Date(rec.fecha_emision).toLocaleDateString('es-ES') : '—'}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {rec.detalle_receta?.map((det, di) => (
                                  <div key={di} className="prescription-item">
                                    <div>
                                      <div className="prescription-name">{det.farmacia?.nombre || '—'}</div>
                                      <div className="prescription-meta">Dosis: {det.dosis} · Frecuencia: {det.frecuencia} · Duración: {det.duracion}</div>
                                    </div>
                                    <span className="badge badge-violet">Activo</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )) : (
                            <p style={{ fontSize: '0.85rem', color: 'var(--slate-400)' }}>Sin receta asociada.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
