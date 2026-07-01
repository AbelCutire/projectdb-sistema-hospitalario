import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function CrearCuentaModal({ persona, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [idRol, setIdRol] = useState('');
  const [roles, setRoles] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('token');
        const data = await api('/persona/roles', { headers: { Authorization: `Bearer ${token}` } });
        setRoles(data || []);
      } catch (err) {
        console.error('Error al cargar roles', err);
      }
    };
    fetchRoles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          id_persona: persona.id_persona,
          correo_institucional: correo,
          contrasena,
          id_rol: Number(idRol)
        })
      });
      onSaved();
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear la cuenta. Verifica que el correo no esté en uso.');
    } finally {
      setLoading(false);
    }
  };

  if (!persona) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 450, padding: 32, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-600)' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--slate-800)' }}>Crear Cuenta de Acceso</h2>
            <div style={{ color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: 2 }}>{persona.nombre} {persona.apellido}</div>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: 12, marginBottom: 16, background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', color: '#991b1b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Correo Institucional</label>
            <input type="email" required className="form-input" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="nombre@hospital.com" />
          </div>

          <div>
            <label className="form-label">Contraseña Temporal</label>
            <input type="password" required className="form-input" value={contrasena} onChange={e => setContrasena(e.target.value)} placeholder="••••••••" />
          </div>

          <div>
            <label className="form-label">Rol del Sistema</label>
            <select className="form-input" required value={idRol} onChange={e => setIdRol(e.target.value)}>
              <option value="">Seleccione rol...</option>
              {roles.map(r => (
                <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '12px 0' }} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px 0' }} disabled={loading}>{loading ? 'Creando...' : 'Crear Cuenta'}</button>
          </div>
        </form>

      </div>
    </div>
  );
}
