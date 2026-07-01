import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const ROLE_COLORS = {
  'Administrador':       'badge-red',
  'Médico Especialista': 'badge-blue',
  'Enfermería':          'badge-cyan',
  'Paciente':            'badge-emerald',
};

export default function DetallesPersonaModal({ personaId, onClose, userRole, userProfile }) {
  const [detalles, setDetalles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('resumen');

  useEffect(() => {
    const fetchDetalles = async () => {
      try {
        const token = localStorage.getItem('token');
        const data = await api(`/persona/${personaId}/detalles`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDetalles(data);
      } catch (err) {
        setError(err.message || 'Error al cargar los detalles.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetalles();
  }, [personaId]);

  if (loading) {
    return (
      <ModalOverlay onClose={onClose}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--slate-500)' }}>Cargando expediente completo...</p>
        </div>
      </ModalOverlay>
    );
  }

  if (error || !detalles) {
    return (
      <ModalOverlay onClose={onClose}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--red-500)' }}>
          <p>{error || 'No se pudo cargar la información.'}</p>
          <button className="btn-secondary" onClick={onClose} style={{ marginTop: 16 }}>Cerrar</button>
        </div>
      </ModalOverlay>
    );
  }

  const p = detalles;
  const isPaciente = !!p.paciente;
  const isEmpleado = !!p.empleado;
  const rolNombre = p.usuario?.rol?.nombre_rol || 'Sin Rol';
  const initial = `${p.nombre?.charAt(0) || ''}${p.apellido?.charAt(0) || ''}`.toUpperCase();

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
        
        {/* Header Elegante Minimalista */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid var(--slate-100)', padding: '32px 40px', display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 600, color: 'var(--slate-700)', border: '1px solid var(--slate-200)' }}>
            {initial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--slate-800)', letterSpacing: '-0.5px' }}>{p.nombre} {p.apellido}</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: 'var(--slate-100)', color: 'var(--slate-600)' }}>
                {rolNombre}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 24, color: 'var(--slate-500)', fontSize: '0.9rem' }}>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                DNI: <span style={{ fontFamily: 'monospace', color: 'var(--slate-700)' }}>{p.dni}</span>
              </span>
              {p.usuario && (
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  Email: <span style={{ color: 'var(--slate-700)' }}>{p.usuario.correo_institucional}</span>
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--slate-400)', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--slate-100)'; e.currentTarget.style.color = 'var(--slate-700)'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slate-400)'; }}>
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ borderBottom: '1px solid var(--slate-200)', padding: '0 32px', display: 'flex', gap: 32, background: '#fafafa', flexShrink: 0 }}>
          <TabButton active={activeTab === 'resumen'} onClick={() => setActiveTab('resumen')}>Información General</TabButton>
          {isPaciente && <TabButton active={activeTab === 'medico'} onClick={() => setActiveTab('medico')}>Historial Médico</TabButton>}
          {isPaciente && <TabButton active={activeTab === 'citas'} onClick={() => setActiveTab('citas')}>Citas Registradas</TabButton>}
          {isEmpleado && <TabButton active={activeTab === 'laboral'} onClick={() => setActiveTab('laboral')}>Datos Laborales</TabButton>}
        </div>

        {/* Contenido Scrolleable */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1, background: 'white' }}>
          
          {activeTab === 'resumen' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)', borderBottom: '2px solid var(--slate-100)', paddingBottom: 12, marginBottom: 20 }}>Datos Personales</h3>
                <DetailRow label="Teléfono" value={p.telefono || 'No registrado'} />
                <DetailRow label="Dirección" value={p.direccion || 'No registrada'} />
                <DetailRow label="Sexo" value={p.sexo || 'No especificado'} />
                <DetailRow label="Fecha Nacimiento" value={p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString() : 'Desconocida'} />
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)', borderBottom: '2px solid var(--slate-100)', paddingBottom: 12, marginBottom: 20 }}>Cuenta del Sistema</h3>
                {p.usuario ? (
                  <>
                    <DetailRow label="Estado" value={p.usuario.estado_activo ? <span style={{ color: 'var(--emerald-600)', fontWeight: 600 }}>Activo</span> : <span style={{ color: 'var(--red-600)', fontWeight: 600 }}>Inactivo</span>} />
                    <DetailRow label="Rol Asignado" value={p.usuario.rol?.nombre_rol || 'Ninguno'} />
                    <DetailRow label="ID Usuario" value={`#${p.usuario.id_usuario}`} />
                  </>
                ) : (
                  <div style={{ padding: 16, background: 'var(--slate-50)', borderRadius: 8, color: 'var(--slate-500)', fontSize: '0.9rem' }}>
                    Esta persona no tiene credenciales de acceso al sistema.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'medico' && isPaciente && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                <MetricCard title="Grupo Sanguíneo" value={p.paciente.grupo_sanguineo} />
                <MetricCard title="Peso" value={`${p.paciente.peso} kg`} />
                <MetricCard title="Altura" value={`${p.paciente.altura} m`} />
                <MetricCard title="Estado Paciente" value={p.paciente.estado_paciente} color={p.paciente.estado_paciente === 'Estable' ? 'var(--emerald-600)' : 'var(--amber-600)'} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)', borderBottom: '2px solid var(--slate-100)', paddingBottom: 12, marginBottom: 20 }}>Antecedentes</h3>
                  <div style={{ background: 'var(--slate-50)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Alergias</div>
                    <div style={{ color: 'var(--slate-800)', fontWeight: 500 }}>{p.paciente.alergias || 'Ninguna registrada'}</div>
                  </div>
                  <div style={{ background: 'var(--slate-50)', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Antecedentes Médicos</div>
                    <div style={{ color: 'var(--slate-800)', fontWeight: 500 }}>{p.paciente.antecedentes_medicos || 'Ninguno registrado'}</div>
                  </div>
                </div>
                
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)', borderBottom: '2px solid var(--slate-100)', paddingBottom: 12, marginBottom: 20 }}>Contacto de Emergencia</h3>
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 8 }}>
                    <div style={{ color: 'var(--blue-700)', fontWeight: 600, fontSize: '1.1rem' }}>{p.paciente.contacto_emergencia || 'No especificado'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'citas' && isPaciente && (() => {
            const citasAMostrar = (userRole === 'Médico Especialista')
              ? (p.paciente.cita || []).filter(c => c.id_doctor === userProfile?.id_persona)
              : (p.paciente.cita || []);
            
            return (
              <div>
                {citasAMostrar.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {citasAMostrar.map(cita => (
                      <div key={cita.id_cita} style={{ border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: 6 }}>
                            {new Date(cita.fecha).toLocaleDateString()} · {new Date(cita.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '1.05rem' }}>
                          Dr. {cita.doctor?.empleado?.persona?.nombre} {cita.doctor?.empleado?.persona?.apellido}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--slate-500)', marginTop: 4 }}>
                          {cita.doctor?.especialidad?.nombre_especialidad} · Consultorio {cita.consultorio?.numero}
                        </div>
                      </div>
                      <div>
                        <span className={`badge ${cita.estado === 'Completada' ? 'badge-emerald' : cita.estado === 'Cancelada' ? 'badge-red' : 'badge-blue'}`}>
                          {cita.estado}
                        </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>{userRole === 'Médico Especialista' ? 'No tienes citas registradas con este paciente.' : 'Este paciente no tiene citas registradas en el historial.'}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'laboral' && isEmpleado && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)', borderBottom: '2px solid var(--slate-100)', paddingBottom: 12, marginBottom: 20 }}>Información de Contrato</h3>
                <DetailRow label="Código Empleado" value={<span style={{ fontFamily: 'monospace', fontWeight: 600, background: 'var(--slate-100)', padding: '2px 6px', borderRadius: 4 }}>{p.empleado.codigo_empleado}</span>} />
                <DetailRow label="Fecha de Ingreso" value={new Date(p.empleado.fecha_ingreso).toLocaleDateString()} />
                <DetailRow label="Estado Laboral" value={<span className={`badge ${p.empleado.estado_laboral === 'Activo' ? 'badge-emerald' : 'badge-slate'}`}>{p.empleado.estado_laboral}</span>} />
                
                {p.empleado.contrato && (
                  <>
                    <div style={{ height: 16 }} />
                    <DetailRow label="Salario" value={`$${p.empleado.contrato.salario}`} />
                    <DetailRow label="Fin de Contrato" value={new Date(p.empleado.contrato.fecha_fin).toLocaleDateString()} />
                  </>
                )}
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)', borderBottom: '2px solid var(--slate-100)', paddingBottom: 12, marginBottom: 20 }}>Datos Específicos</h3>
                {p.empleado.doctor && (
                  <>
                    <DetailRow label="Colegiatura (CMP)" value={p.empleado.doctor.numero_colegiatura} />
                    <DetailRow label="Especialidad" value={<span style={{ fontWeight: 600, color: 'var(--blue-600)' }}>{p.empleado.doctor.especialidad?.nombre_especialidad}</span>} />
                  </>
                )}
                {p.empleado.enfermera && (
                  <DetailRow label="Turno Asignado" value={p.empleado.enfermera.turno?.nombre_turno || 'No asignado'} />
                )}
                {p.empleado.personal_administrativo && (
                  <>
                    <DetailRow label="Área Administrativa" value={p.empleado.personal_administrativo.area_asignada} />
                    <DetailRow label="Cargo" value={p.empleado.personal_administrativo.cargo_especifico} />
                  </>
                )}
                {p.empleado.personal_limpieza && (
                  <>
                    <DetailRow label="Área de Limpieza" value={p.empleado.personal_limpieza.area_asignada} />
                    <DetailRow label="Turno" value={p.empleado.personal_limpieza.turno?.nombre_turno || 'No asignado'} />
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </ModalOverlay>
  );
}

// Subcomponentes auxiliares
function ModalOverlay({ children, onClose }) {
  return (
    <>
      <div 
        onClick={onClose} 
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(5px)', zIndex: 1000 }} 
      />
      <div style={{ 
        position: 'fixed', top: '5vh', left: '50%', transform: 'translateX(-50%)', 
        width: 'min(900px, 95vw)', height: '90vh', background: 'white', 
        borderRadius: 20, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', zIndex: 1001, 
        overflow: 'hidden', display: 'flex', flexDirection: 'column' 
      }}>
        {children}
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button 
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: '16px 0', 
        color: active ? 'var(--blue-600)' : 'var(--slate-500)',
        borderBottom: active ? '3px solid var(--blue-600)' : '3px solid transparent',
        fontWeight: active ? 600 : 500, fontSize: '0.95rem', cursor: 'pointer',
        transition: 'all 0.2s', marginBottom: '-1px'
      }}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--slate-200)' }}>
      <span style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ color: 'var(--slate-800)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function MetricCard({ title, value, color = 'var(--blue-600)' }) {
  return (
    <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-100)', padding: '16px', borderRadius: 12, textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
