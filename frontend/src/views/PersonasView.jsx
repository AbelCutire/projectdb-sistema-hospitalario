import React, { useState, useMemo } from 'react';
import { api } from '../services/api';

const ROLE_COLORS = {
  'Administrador':       'badge-red',
  'Médico Especialista': 'badge-blue',
  'Enfermería':          'badge-cyan',
  'Paciente':            'badge-emerald',
};

const TIPO_LABEL = (persona) => {
  if (persona.empleado?.doctor)                   return 'Médico Especialista';
  if (persona.empleado?.enfermera)                return 'Enfermería';
  if (persona.empleado?.personal_administrativo)  return 'Administrador';
  if (persona.paciente)                           return 'Paciente';
  return 'Sin tipo';
};

export default function PersonasView({ loadingPersonas, filteredPersonas, resumenTexto }) {
  const [rolFiltro, setRolFiltro]     = useState('Todos');
  const [rolModal, setRolModal]       = useState(null); // persona seleccionada para cambiar rol
  const [roles, setRoles]             = useState([]);
  const [nuevoRol, setNuevoRol]       = useState('');
  const [saving, setSaving]           = useState(false);
  const [msgRol, setMsgRol]           = useState('');

  const token = localStorage.getItem('token');

  const abrirModal = async (persona) => {
    setMsgRol('');
    setNuevoRol(persona.usuario?.id_rol?.toString() || '');
    setRolModal(persona);
    if (roles.length === 0) {
      const data = await api('/persona/roles', { headers: { Authorization: `Bearer ${token}` } }).catch(() => []);
      setRoles(data || []);
    }
  };

  const handleCambiarRol = async () => {
    if (!nuevoRol || !rolModal) return;
    setSaving(true);
    setMsgRol('');
    try {
      await api(`/persona/${rolModal.id_persona}/rol`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_rol: parseInt(nuevoRol, 10) })
      });
      setMsgRol('Rol actualizado correctamente.');
      setTimeout(() => { setRolModal(null); window.location.reload(); }, 1000);
    } catch (err) {
      setMsgRol(err.message || 'Error al cambiar rol.');
    } finally {
      setSaving(false);
    }
  };

  const FILTRO_OPTIONS = ['Todos', 'Médico Especialista', 'Administrador', 'Enfermería', 'Paciente', 'Sin cuenta'];

  const personasFiltradas = useMemo(() => {
    if (rolFiltro === 'Todos') return filteredPersonas;
    if (rolFiltro === 'Sin cuenta') return filteredPersonas.filter(p => !p.usuario);
    return filteredPersonas.filter(p => {
      const rolUsuario = p.usuario?.rol?.nombre_rol;
      return rolUsuario === rolFiltro;
    });
  }, [filteredPersonas, rolFiltro]);

  if (loadingPersonas) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span style={{ color: 'var(--slate-400)', fontSize: '0.9rem' }}>Cargando directorio...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Directorio de Personas</h1>
        <p>Gestiona el personal, pacientes y sus roles en el sistema hospitalario.</p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Registros del Sistema</div>
            <div className="panel-subtitle">{resumenTexto} · mostrando {personasFiltradas.length}</div>
          </div>
          <span className="badge badge-slate">{filteredPersonas.length} personas</span>
        </div>

        {/* Filtros por rol */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {FILTRO_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => setRolFiltro(f)}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                border: rolFiltro === f ? '2px solid var(--blue-500)' : '1.5px solid var(--slate-200)',
                background: rolFiltro === f ? 'var(--blue-50)' : '#fff',
                color: rolFiltro === f ? 'var(--blue-600)' : 'var(--slate-500)',
                fontSize: '0.78rem',
                fontWeight: rolFiltro === f ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {personasFiltradas.length === 0 ? (
          <div className="empty-state"><p>No se encontraron personas con esos criterios.</p></div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>DNI</th>
                  <th>Rol en Sistema</th>
                  <th>Tipo</th>
                  <th>Teléfono</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {personasFiltradas.map(p => {
                  const initial  = `${p.nombre?.charAt(0) || ''}${p.apellido?.charAt(0) || ''}`.toUpperCase();
                  const rolNombre = p.usuario?.rol?.nombre_rol;
                  const tipo      = TIPO_LABEL(p);
                  const espec     = p.empleado?.doctor?.especialidad?.nombre_especialidad;

                  return (
                    <tr key={p.id_persona}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="persona-card-avatar">{initial}</div>
                          <div>
                            <div className="td-bold">{p.nombre} {p.apellido}</div>
                            {espec && <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{espec}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="td-bold" style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                        {p.dni || '—'}
                      </td>
                      <td>
                        {rolNombre
                          ? <span className={`badge ${ROLE_COLORS[rolNombre] || 'badge-slate'}`}>{rolNombre}</span>
                          : <span className="badge badge-slate">Sin cuenta</span>
                        }
                      </td>
                      <td>
                        <span className={`badge ${ROLE_COLORS[tipo] || 'badge-slate'}`}>{tipo}</span>
                      </td>
                      <td>{p.telefono || '—'}</td>
                      <td>
                        <button
                          className="btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '0.78rem', borderRadius: 7 }}
                          onClick={() => abrirModal(p)}
                        >
                          {p.usuario ? 'Cambiar Rol' : 'Asignar Rol'}
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

      {/* Modal cambiar rol */}
      {rolModal && (
        <>
          <div
            onClick={() => setRolModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: 18, width: 'min(460px, 90vw)',
            boxShadow: '0 20px 60px rgba(15,23,42,0.15)', zIndex: 201, overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ background: 'var(--slate-900)', padding: '24px 28px', color: '#fff' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                {rolModal.usuario ? 'Modificar Rol de Usuario' : 'Asignar Cuenta y Rol'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {rolModal.nombre} {rolModal.apellido}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                DNI: {rolModal.dni}
                {rolModal.usuario && ` · Rol actual: ${rolModal.usuario.rol?.nombre_rol}`}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '28px' }}>
              {!rolModal.usuario ? (
                <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 14px', fontSize: '0.85rem', color: '#92400e', marginBottom: 20 }}>
                  Esta persona no tiene cuenta de usuario. Para asignarle un rol primero debe crearse su cuenta desde el módulo de registro.
                </div>
              ) : (
                <>
                  <div className="form-label" style={{ marginBottom: 8 }}>Nuevo Rol</div>
                  <select
                    className="form-select"
                    style={{ width: '100%', marginBottom: 20 }}
                    value={nuevoRol}
                    onChange={e => setNuevoRol(e.target.value)}
                  >
                    <option value="">Seleccione un rol</option>
                    {roles.map(r => (
                      <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
                    ))}
                  </select>
                </>
              )}

              {msgRol && (
                <p style={{ fontSize: '0.85rem', color: msgRol.includes('Error') ? 'var(--red-500)' : 'var(--emerald-600)', marginBottom: 16 }}>
                  {msgRol}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: 11, borderRadius: 10 }}
                  onClick={() => setRolModal(null)}
                >
                  Cancelar
                </button>
                {rolModal.usuario && (
                  <button
                    className="btn-primary"
                    style={{ flex: 2, padding: 11, borderRadius: 10 }}
                    onClick={handleCambiarRol}
                    disabled={saving || !nuevoRol}
                  >
                    {saving ? 'Guardando...' : 'Confirmar Cambio'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
