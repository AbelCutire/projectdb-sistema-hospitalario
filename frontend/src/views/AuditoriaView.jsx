import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const ACTION_COLORS = {
  'INICIAR_SESION': 'badge-emerald',
  'CREAR_CITA': 'badge-blue',
  'ACTUALIZAR_ROL': 'badge-cyan',
  'ELIMINAR_PERSONA': 'badge-red',
  'CANCELAR_CITA': 'badge-amber',
  'CREAR_DIAGNOSTICO': 'badge-purple',
};

export default function AuditoriaView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const data = await api('/auditoria', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(data || []);
      } catch (err) {
        setError(err.message || 'Error al obtener registros de auditoría');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const userName = log.usuario?.persona ? `${log.usuario.persona.nombre} ${log.usuario.persona.apellido}`.toLowerCase() : '';
    const userDni = log.usuario?.persona?.dni || '';
    return log.accion_realizada.toLowerCase().includes(term) || 
           log.tabla_afectada.toLowerCase().includes(term) ||
           userName.includes(term) ||
           userDni.includes(term);
  });

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span style={{ color: 'var(--slate-400)' }}>Cargando registros del sistema...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <p style={{ color: 'var(--red-500)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Auditoría del Sistema</h1>
        <p>Monitor de seguridad y registro de actividades críticas realizadas por los usuarios.</p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Trazabilidad de Datos</div>
            <div className="panel-subtitle">Mostrando los últimos 100 eventos registrados en la base de datos</div>
          </div>
          <div className="topbar-search" style={{ width: 280, margin: 0 }}>
            <input 
              type="text" 
              placeholder="Buscar acción, tabla, usuario o DNI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', borderRadius: 20, outline: 'none' }}
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <p>No se encontraron registros de auditoría que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario Responsable</th>
                  <th>Acción Técnica</th>
                  <th>Módulo / Tabla</th>
                  <th>Detalles del Cambio</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const date = log.fecha_hora ? new Date(log.fecha_hora) : null;
                  const persona = log.usuario?.persona;
                  const initial = persona ? `${persona.nombre.charAt(0)}${persona.apellido.charAt(0)}`.toUpperCase() : 'S';
                  
                  return (
                    <tr key={log.id_auditoria}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--slate-700)' }}>
                          {date ? date.toLocaleDateString() : '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                          {date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td>
                        {persona ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--slate-100)', color: 'var(--slate-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                              {initial}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.85rem' }}>{persona.nombre} {persona.apellido}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontFamily: 'monospace' }}>DNI: {persona.dni}</div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>Sistema Interno (ID: {log.id_usuario})</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${ACTION_COLORS[log.accion_realizada] || 'badge-slate'}`} style={{ letterSpacing: '0.5px' }}>
                          {log.accion_realizada.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--slate-600)' }}>
                        {log.tabla_afectada}
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--slate-700)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {log.descripcion_cambio || 'Sin detalles adicionales registrados.'}
                        </div>
                      </td>
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
