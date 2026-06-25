import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

/* =====================================================================
   MAIN EXPORT — selects dashboard by role
   ===================================================================== */
export default function DashboardView({ userRole, userProfile }) {
  const [data, setData]       = useState({
    citas: [], pacientes: [], doctores: [], departamentos: [],
    farmacia: [], camillas: [], recetas: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token   = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      api('/cita',          { headers }).catch(() => []),
      api('/paciente',      { headers }).catch(() => []),
      api('/doctor',        { headers }).catch(() => []),
      api('/departamento',  { headers }).catch(() => []),
      api('/farmacia',      { headers }).catch(() => []),
      api('/camilla',       { headers }).catch(() => []),
      api('/receta',        { headers }).catch(() => [])
    ]).then(([citas, pacientes, doctores, departamentos, farmacia, camillas, recetas]) => {
      setData({ citas, pacientes, doctores, departamentos, farmacia, camillas, recetas });
    }).finally(() => setLoading(false));
  }, [userRole]);

  const handleToggleCamilla = async (id, estadoActual) => {
    const token        = localStorage.getItem('token');
    const proximoEstado =
      estadoActual === 'Disponible' ? 'Ocupado' :
      estadoActual === 'Ocupado'    ? 'Limpieza' : 'Disponible';

    try {
      await api(`/camilla/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: proximoEstado })
      });
      const updated = await api('/camilla', { headers: { Authorization: `Bearer ${token}` } }).catch(() => []);
      setData(prev => ({ ...prev, camillas: updated || [] }));
    } catch (err) {
      console.error('Error al actualizar camilla:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span style={{ color: 'var(--slate-400)', fontSize: '0.9rem' }}>Cargando información...</span>
      </div>
    );
  }

  switch (userRole) {
    case 'Administrador':
      return <AdminDashboard {...data} />;
    case 'Médico Especialista':
      return <DoctorDashboard citas={data.citas} userProfile={userProfile} />;
    case 'Enfermería':
      return <NurseDashboard camillas={data.camillas} onToggleCamilla={handleToggleCamilla} />;
    case 'Paciente':
      return <PatientDashboard citas={data.citas} recetas={data.recetas} userProfile={userProfile} />;
    default:
      return (
        <div className="empty-state">
          <p>Acceso no autorizado para este rol.</p>
        </div>
      );
  }
}

/* =====================================================================
   1. TABLERO ADMINISTRATIVO
   ===================================================================== */
function AdminDashboard({ citas, pacientes, doctores, departamentos, farmacia }) {
  return (
    <div className="dashboard-wrapper">
      <div className="page-header">
        <h1>Panel Administrativo</h1>
        <p>Resumen operacional consolidado del sistema hospitalario.</p>
      </div>

      <div className="metrics-grid metrics-grid-4">
        <MetricCard color="blue"    label="Pacientes"            value={pacientes.length}    sub="Registros activos" />
        <MetricCard color="violet"  label="Médicos"              value={doctores.length}     sub="Cuerpo médico" />
        <MetricCard color="emerald" label="Citas Totales"        value={citas.length}        sub="Acumulado en sistema" />
        <MetricCard color="cyan"    label="Departamentos"        value={departamentos.length} sub="Especialidades activas" />
      </div>

      <div className="two-col-layout-wide">
        {/* Departamentos */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Departamentos Clínicos</div>
              <div className="panel-subtitle">Estructura organizacional por especialidad</div>
            </div>
            <span className="badge badge-slate">{departamentos.length} depts.</span>
          </div>
          {departamentos.length === 0 ? (
            <EmptyState msg="Sin departamentos registrados." />
          ) : (
            departamentos.map(d => (
              <div key={d.id_departamento} className="data-row">
                <div>
                  <div className="data-row-label">{d.nombre}</div>
                  <div className="data-row-sub">{d.ubicacion}</div>
                </div>
                <div className="data-row-value">
                  {d.consultorio?.length || 0} consultorios
                </div>
              </div>
            ))
          )}
        </div>

        {/* Inventario farmacéutico */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Inventario Farmacéutico</div>
              <div className="panel-subtitle">Stock reciente disponible</div>
            </div>
          </div>
          {farmacia.length === 0 ? (
            <EmptyState msg="Sin registros farmacéuticos." />
          ) : (
            farmacia.slice(0, 6).map(f => (
              <div key={f.id_farmacia} className="data-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: f.stock > 100 ? 'var(--emerald-500)' : 'var(--amber-500)'
                    }}
                  />
                  <div>
                    <div className="data-row-label">{f.nombre}</div>
                    <div className="data-row-sub">Stock: {f.stock} uds.</div>
                  </div>
                </div>
                <div className="data-row-value">S/ {parseFloat(f.precio).toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Citas recientes */}
      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel-header">
          <div>
            <div className="panel-title">Citas Registradas</div>
            <div className="panel-subtitle">Agenda general del sistema</div>
          </div>
          <span className="badge badge-blue">{citas.length} total</span>
        </div>
        {citas.length === 0 ? (
          <EmptyState msg="Sin citas registradas." />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Especialidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {citas.slice(0, 8).map(c => {
                  const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES') : '—';
                  const hora  = c.hora  ? new Date(c.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
                  return (
                    <tr key={c.id_cita}>
                      <td className="td-bold">{fecha} <span style={{ color: 'var(--slate-400)', fontWeight: 400 }}>{hora}</span></td>
                      <td>{c.paciente?.persona?.nombre} {c.paciente?.persona?.apellido}</td>
                      <td>Dr. {c.doctor?.empleado?.persona?.nombre} {c.doctor?.empleado?.persona?.apellido}</td>
                      <td>{c.doctor?.especialidad?.nombre_especialidad || '—'}</td>
                      <td><StatusBadge estado={c.estado} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   2. TABLERO MÉDICO
   ===================================================================== */
function DoctorDashboard({ citas, userProfile }) {
  const misCitas = useMemo(() =>
    citas
      .filter(c => c.id_doctor === userProfile?.id_persona)
      .sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora)),
    [citas, userProfile]
  );

  const completadas = misCitas.filter(c => c.estado === 'Completada').length;
  const pendientes  = misCitas.filter(c => c.estado !== 'Completada').length;
  const enEspera    = misCitas.filter(c => c.estado !== 'Completada');

  return (
    <div className="dashboard-wrapper">
      <div className="page-header">
        <h1>Tu Agenda Médica</h1>
        <p>Cronograma de consultas e información de pacientes asignados.</p>
      </div>

      <div className="metrics-grid metrics-grid-3">
        <MetricCard color="blue"    label="Citas Asignadas" value={misCitas.length} sub="Total en sistema" />
        <MetricCard color="emerald" label="Completadas"     value={completadas}     sub="Consultas finalizadas" />
        <MetricCard color="amber"   label="Por Atender"     value={pendientes}      sub="Pacientes en espera" />
      </div>

      <div className="two-col-layout-wide">
        {/* Timeline de consultas */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Cronograma de Consultas</div>
              <div className="panel-subtitle">Agenda ordenada por fecha y hora</div>
            </div>
          </div>
          {misCitas.length === 0 ? (
            <EmptyState msg="No tienes consultas registradas." />
          ) : (
            <div className="timeline">
              {misCitas.map(cita => {
                const fecha = cita.fecha ? new Date(cita.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—';
                const hora  = cita.hora  ? new Date(cita.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
                const done  = cita.estado === 'Completada';
                return (
                  <div key={cita.id_cita} className="timeline-item">
                    <div className={`timeline-dot ${done ? 'done' : ''}`} />
                    <div className={`timeline-time-label ${done ? 'done' : ''}`}>
                      {fecha} — {hora}
                    </div>
                    <div className="timeline-box">
                      <div className="timeline-box-name">
                        {cita.paciente?.persona?.nombre} {cita.paciente?.persona?.apellido}
                      </div>
                      <div className="timeline-box-meta">
                        <span>DNI: {cita.paciente?.persona?.dni || '—'}</span>
                        <StatusBadge estado={cita.estado} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista de espera */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Sala de Espera</div>
              <div className="panel-subtitle">Pacientes con cita pendiente</div>
            </div>
            <span className="badge badge-amber">{enEspera.length}</span>
          </div>
          {enEspera.length === 0 ? (
            <EmptyState msg="No hay pacientes en espera." />
          ) : (
            enEspera.map(c => {
              const nombre   = `${c.paciente?.persona?.nombre || ''} ${c.paciente?.persona?.apellido || ''}`.trim();
              const initials = nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
              return (
                <div key={c.id_cita} className="waiting-item">
                  <div className="waiting-item-avatar">{initials}</div>
                  <div>
                    <span className="waiting-item-name">{nombre || '—'}</span>
                    <span className="waiting-item-meta">DNI: {c.paciente?.persona?.dni || '—'} · Tlf: {c.paciente?.persona?.telefono || '—'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   3. TABLERO DE ENFERMERÍA
   ===================================================================== */
function NurseDashboard({ camillas, onToggleCamilla }) {
  const totalDisponibles = useMemo(() => camillas.filter(c => c.estado === 'Disponible').length, [camillas]);
  const totalOcupadas    = useMemo(() => camillas.filter(c => c.estado === 'Ocupado').length, [camillas]);
  const totalLimpieza    = useMemo(() => camillas.filter(c => c.estado === 'Limpieza').length, [camillas]);

  const urgencias = useMemo(() => camillas.filter(c => c.sala?.tipo_sala === 'Urgencias'), [camillas]);
  const uci       = useMemo(() => camillas.filter(c => c.sala?.tipo_sala === 'UCI'), [camillas]);
  const otras     = useMemo(() => camillas.filter(c => c.sala?.tipo_sala !== 'Urgencias' && c.sala?.tipo_sala !== 'UCI'), [camillas]);

  const classForState = (estado) =>
    estado === 'Disponible' ? 'available' : estado === 'Ocupado' ? 'occupied' : 'cleaning';

  return (
    <div className="dashboard-wrapper">
      <div className="page-header">
        <h1>Control Asistencial</h1>
        <p>Gestión y monitoreo del estado de camillas en tiempo real.</p>
      </div>

      <div className="metrics-grid metrics-grid-3">
        <MetricCard color="emerald" label="Camillas Totales"   value={camillas.length} sub="Capacidad instalada" />
        <MetricCard color="red"     label="Ocupadas"           value={totalOcupadas}   sub="Pacientes internados" />
        <MetricCard color="amber"   label="En Mantenimiento"   value={totalLimpieza}   sub="En proceso de limpieza" />
      </div>

      <div className="two-col-layout-wide">
        {/* Mapa de camillas */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Mapa de Camillas</div>
              <div className="panel-subtitle">Seleccione una camilla para cambiar su estado</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-green">{totalDisponibles} libres</span>
              <span className="badge badge-red">{totalOcupadas} ocupadas</span>
            </div>
          </div>

          {camillas.length === 0 ? (
            <EmptyState msg="No hay camillas registradas en base de datos." />
          ) : (
            <>
              {urgencias.length > 0 && (
                <>
                  <div className="bed-section-label">Urgencias</div>
                  <div className="bed-grid">
                    {urgencias.map(bed => (
                      <div
                        key={bed.id_camilla}
                        className={`bed-card ${classForState(bed.estado)}`}
                        onClick={() => onToggleCamilla(bed.id_camilla, bed.estado)}
                      >
                        <span className="bed-number">{bed.id_camilla}</span>
                        <span className="bed-status-pill">{bed.estado}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {uci.length > 0 && (
                <>
                  <div className="bed-section-label" style={{ marginTop: urgencias.length > 0 ? 20 : 0 }}>UCI</div>
                  <div className="bed-grid">
                    {uci.map(bed => (
                      <div
                        key={bed.id_camilla}
                        className={`bed-card ${classForState(bed.estado)}`}
                        onClick={() => onToggleCamilla(bed.id_camilla, bed.estado)}
                      >
                        <span className="bed-number">{bed.id_camilla}</span>
                        <span className="bed-status-pill">{bed.estado}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {otras.length > 0 && (
                <>
                  <div className="bed-section-label" style={{ marginTop: (urgencias.length > 0 || uci.length > 0) ? 20 : 0 }}>General</div>
                  <div className="bed-grid">
                    {otras.map(bed => (
                      <div
                        key={bed.id_camilla}
                        className={`bed-card ${classForState(bed.estado)}`}
                        onClick={() => onToggleCamilla(bed.id_camilla, bed.estado)}
                      >
                        <span className="bed-number">{bed.id_camilla}</span>
                        <span className="bed-status-pill">{bed.estado}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Leyenda + Tareas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Leyenda de Estados</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Disponible', desc: 'Sin paciente asignado',        badgeCls: 'badge-green', dot: 'var(--emerald-500)', count: totalDisponibles },
                { label: 'Ocupado',    desc: 'Paciente internado',           badgeCls: 'badge-red',   dot: 'var(--red-500)',     count: totalOcupadas    },
                { label: 'Limpieza',   desc: 'En proceso de desinfección',   badgeCls: 'badge-amber', dot: 'var(--amber-500)',   count: totalLimpieza    }
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-700)' }}>{s.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{s.desc}</div>
                    </div>
                  </div>
                  <span className={`badge ${s.badgeCls}`}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Tareas Clínicas</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Triaje de Ingresos',       sub: 'Monitoreo en urgencias' },
                { label: 'Control de Parámetros',    sub: 'Revisión periódica en UCI' },
                { label: 'Desinfección de Áreas',    sub: 'Camillas marcadas en limpieza' },
                { label: 'Registro de Medicamentos', sub: 'Administración de dosis' },
              ].map((task, i) => (
                <label
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 11,
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--slate-50)', border: '1px solid var(--slate-100)',
                    cursor: 'pointer'
                  }}
                >
                  <input type="checkbox" defaultChecked={i === 0} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-700)' }}>{task.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: 2 }}>{task.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   4. TABLERO DE PACIENTE
   ===================================================================== */
function PatientDashboard({ citas, recetas, userProfile }) {
  const misCitas = useMemo(() =>
    citas
      .filter(c => c.id_paciente === userProfile?.id_persona)
      .sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora)),
    [citas, userProfile]
  );

  const proximaCita = useMemo(() =>
    misCitas.find(c => c.estado !== 'Completada'),
    [misCitas]
  );

  const misRecetas = useMemo(() =>
    recetas.filter(r => r.tratamiento?.diagnostico?.id_paciente === userProfile?.id_persona),
    [recetas, userProfile]
  );

  const completadas = misCitas.filter(c => c.estado === 'Completada').length;

  return (
    <div className="dashboard-wrapper">
      <div className="page-header">
        <h1>
          {userProfile?.persona?.nombre
            ? `Bienvenido, ${userProfile.persona.nombre}`
            : 'Portal del Paciente'}
        </h1>
        <p>Consulta tus citas programadas y tu historial de prescripciones médicas.</p>
      </div>

      <div className="metrics-grid metrics-grid-3">
        <MetricCard color="blue"    label="Citas Totales"   value={misCitas.length}    sub="Agendadas en sistema" />
        <MetricCard color="emerald" label="Completadas"     value={completadas}        sub="Consultas atendidas" />
        <MetricCard color="violet"  label="Recetas Activas" value={misRecetas.length}  sub="Prescripciones vigentes" />
      </div>

      <div className="two-col-layout">
        {/* Próxima cita */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Próxima Consulta</div>
              <div className="panel-subtitle">Tu cita más próxima pendiente</div>
            </div>
          </div>
          {proximaCita ? (
            <div className="next-appointment-card">
              <span className="next-appointment-label">Consulta Programada</span>
              <div className="next-appointment-doctor">
                Dr. {proximaCita.doctor?.empleado?.persona?.nombre} {proximaCita.doctor?.empleado?.persona?.apellido}
              </div>
              <div className="next-appointment-specialty">
                {proximaCita.doctor?.especialidad?.nombre_especialidad || 'Especialidad no indicada'}
              </div>
              <hr className="next-appointment-divider" />
              <div className="next-appointment-meta">
                <div className="next-appointment-meta-item">
                  <strong>Fecha</strong>
                  <span>{proximaCita.fecha ? new Date(proximaCita.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</span>
                </div>
                <div className="next-appointment-meta-item">
                  <strong>Hora</strong>
                  <span>{proximaCita.hora ? new Date(proximaCita.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}</span>
                </div>
                <div className="next-appointment-meta-item">
                  <strong>Consultorio</strong>
                  <span>
                    {proximaCita.consultorio
                      ? `Cons. ${proximaCita.consultorio.numero}${proximaCita.consultorio.departamento?.nombre ? ' · ' + proximaCita.consultorio.departamento.nombre : ''}`
                      : `Cons. ${proximaCita.id_consultorio}`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState msg="No tienes consultas médicas pendientes." />
          )}

          {misCitas.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Historial</div>
              {misCitas.slice(0, 4).map(c => {
                const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—';
                return (
                  <div key={c.id_cita} className="data-row">
                    <div>
                      <div className="data-row-label">Dr. {c.doctor?.empleado?.persona?.nombre} {c.doctor?.empleado?.persona?.apellido}</div>
                      <div className="data-row-sub">{fecha} · {c.doctor?.especialidad?.nombre_especialidad || '—'}</div>
                    </div>
                    <StatusBadge estado={c.estado} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recetas */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Prescripciones Médicas</div>
              <div className="panel-subtitle">Medicamentos recetados activos</div>
            </div>
            {misRecetas.length > 0 && (
              <span className="badge badge-violet">{misRecetas.length}</span>
            )}
          </div>
          {misRecetas.length === 0 ? (
            <EmptyState msg="No tienes recetas activas registradas." />
          ) : (
            misRecetas.map(r =>
              r.detalle_receta?.map((det, idx) => (
                <div key={idx} className="prescription-item">
                  <div>
                    <div className="prescription-name">{det.farmacia?.nombre || '—'}</div>
                    <div className="prescription-meta">
                      Dosis: {det.dosis} · Frecuencia: {det.frecuencia} · Duración: {det.duracion}
                    </div>
                  </div>
                  <span className="badge badge-violet">Activo</span>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   SHARED COMPONENTS
   ===================================================================== */

function MetricCard({ color, label, value, sub }) {
  return (
    <div className={`metric-card ${color}`}>
      <div className="metric-card-label">{label}</div>
      <div className="metric-card-value">{value}</div>
      <div className="metric-card-sub">{sub}</div>
    </div>
  );
}

function StatusBadge({ estado }) {
  const map = {
    'Completada': 'badge-green',
    'Pendiente':  'badge-blue',
    'Cancelada':  'badge-red',
    'Confirmada': 'badge-cyan',
  };
  const cls = map[estado] || 'badge-slate';
  return <span className={`badge ${cls}`}>{estado}</span>;
}

function EmptyState({ msg }) {
  return (
    <div className="empty-state" style={{ padding: '36px 20px' }}>
      <p>{msg}</p>
    </div>
  );
}
