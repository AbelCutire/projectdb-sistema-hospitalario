import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? '' : dt.toISOString().split('T')[0];
};

const calcAge = (dateStr) => {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  if (isNaN(birth)) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export default function ProfileView({ userProfile, userRole, onProfileUpdate, onLogout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', dni: '', telefono: '', direccion: '', sexo: '', fecha_nacimiento: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userProfile?.persona) {
      const dbSexo = userProfile.persona.sexo;
      const initialSexo = (dbSexo === 'Masculino' || dbSexo === 'Femenino') ? dbSexo : '';
      setFormData({
        nombre:           userProfile.persona.nombre           || '',
        apellido:         userProfile.persona.apellido         || '',
        dni:              userProfile.persona.dni              || '',
        telefono:         userProfile.persona.telefono         || '',
        direccion:        userProfile.persona.direccion        || '',
        sexo:             initialSexo,
        fecha_nacimiento: fmtDate(userProfile.persona.fecha_nacimiento)
      });
    }
  }, [userProfile, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userProfile?.id_persona) return;
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const updated = await api(`/persona/${userProfile.id_persona}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (onProfileUpdate) onProfileUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const nombre   = userProfile?.persona?.nombre   || '';
  const apellido = userProfile?.persona?.apellido || '';
  const initials = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() ||
    userProfile?.correo_institucional?.charAt(0)?.toUpperCase() || 'U';
  const displayName = nombre ? `${nombre} ${apellido}` : userProfile?.correo_institucional || 'Usuario';

  // Real ID from database - show the actual user ID
  const patientId = userProfile?.id_usuario
    ? `#${String(userProfile.id_usuario).padStart(4, '0')}`
    : '—';

  // Real age from fecha_nacimiento in DB
  const age = calcAge(userProfile?.persona?.fecha_nacimiento);

  const handleCopyId = () => {
    navigator.clipboard.writeText(patientId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const birthFormatted = userProfile?.persona?.fecha_nacimiento
    ? new Date(userProfile.persona.fecha_nacimiento).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : '—';

  return (
    <div>
      <div className="page-header">
        <h1>Perfil</h1>
        <p>Administra tu información personal y preferencias de cuenta.</p>
      </div>

      <div className="pv2-shell">
        {/* ── Panel izquierdo ─────────────────────── */}
        <div className="pv2-side">
          <div className="pv2-side-card">
            <div className="pv2-avatar">{initials}</div>
            <div className="pv2-name">{displayName}</div>
            <span className="pv2-role-badge">{userRole}</span>

            <div className="pv2-info-block">
              <div className="pv2-info-row">
                <span className="pv2-info-label">ID de Usuario</span>
                <button className="pv2-copy-btn" onClick={handleCopyId} title="Copiar ID">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {copied ? '¡Copiado!' : ''}
                </button>
              </div>
              <div className="pv2-info-value pv2-id">{patientId}</div>
            </div>

            <div className="pv2-stat-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              <div>
                <div className="pv2-stat-label">Edad</div>
                <div className="pv2-stat-value">{age !== null ? `${age} años` : '—'}</div>
              </div>
            </div>

            <div className="pv2-stat-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <div>
                <div className="pv2-stat-label">DNI</div>
                <div className="pv2-stat-value">{userProfile?.persona?.dni || '—'}</div>
              </div>
            </div>

            {onLogout && (
              <button className="pv2-logout-btn" onClick={onLogout}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Cerrar sesión
              </button>
            )}
          </div>
        </div>

        {/* ── Panel derecho ───────────────────────── */}
        <div className="pv2-main">
          <div className="pv2-main-card">
            <div className="pv2-main-header">
              <div className="pv2-main-title">
                Información Personal
                <div className="pv2-title-underline" />
              </div>
              {!isEditing && (
                <button className="pv2-edit-btn" onClick={() => setIsEditing(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editar Perfil
                </button>
              )}
            </div>

            <div className="pv2-main-body">
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="pv2-fields-grid">
                    <div className="pv2-field">
                      <label className="pv2-field-label">Nombres</label>
                      <input type="text" name="nombre" required className="pv2-field-input"
                        value={formData.nombre} onChange={handleChange} disabled={userRole !== 'Administrador'} />
                    </div>
                    <div className="pv2-field">
                      <label className="pv2-field-label">Apellidos</label>
                      <input type="text" name="apellido" required className="pv2-field-input"
                        value={formData.apellido} onChange={handleChange} disabled={userRole !== 'Administrador'} />
                    </div>
                    <div className="pv2-field">
                      <label className="pv2-field-label">DNI</label>
                      <input type="text" name="dni" required className="pv2-field-input"
                        value={formData.dni} onChange={handleChange} disabled={userRole !== 'Administrador'} />
                    </div>
                    <div className="pv2-field">
                      <label className="pv2-field-label">Teléfono</label>
                      <input type="text" name="telefono" required className="pv2-field-input"
                        value={formData.telefono} onChange={handleChange} />
                    </div>
                    <div className="pv2-field">
                      <label className="pv2-field-label">Sexo</label>
                      <select name="sexo" required className="pv2-field-input"
                        value={formData.sexo} onChange={handleChange} disabled={userRole !== 'Administrador'}>
                        <option value="" disabled>Seleccione...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                      </select>
                    </div>
                    <div className="pv2-field">
                      <label className="pv2-field-label">Fecha de Nacimiento</label>
                      <input type="date" name="fecha_nacimiento" required className="pv2-field-input"
                        value={formData.fecha_nacimiento} onChange={handleChange} disabled={userRole !== 'Administrador'} />
                    </div>
                    <div className="pv2-field pv2-field-full">
                      <label className="pv2-field-label">Dirección</label>
                      <input type="text" name="direccion" required className="pv2-field-input"
                        value={formData.direccion} onChange={handleChange} />
                    </div>
                  </div>

                  {error && <p style={{ color: 'var(--red-500)', fontSize: '0.875rem', marginTop: 16 }}>{error}</p>}

                  <div className="pv2-form-actions">
                    <button type="button" className="pv2-cancel-btn"
                      onClick={() => setIsEditing(false)} disabled={saving}>Cancelar</button>
                    <button type="submit" className="pv2-save-btn" disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pv2-fields-grid">
                  <div className="pv2-info-field">
                    <div className="pv2-info-field-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </div>
                    <div>
                      <div className="pv2-info-field-label">Correo institucional</div>
                      <div className="pv2-info-field-value">{userProfile?.correo_institucional || '—'}</div>
                    </div>
                  </div>

                  <div className="pv2-info-field">
                    <div className="pv2-info-field-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.7 19.79 19.79 0 0 1 1.61 1.07 2 2 0 0 1 3.6 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </div>
                    <div>
                      <div className="pv2-info-field-label">Teléfono</div>
                      <div className="pv2-info-field-value">{userProfile?.persona?.telefono || '—'}</div>
                    </div>
                  </div>

                  <div className="pv2-info-field">
                    <div className="pv2-info-field-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                    </div>
                    <div>
                      <div className="pv2-info-field-label">DNI</div>
                      <div className="pv2-info-field-value">{userProfile?.persona?.dni || '—'}</div>
                    </div>
                  </div>

                  <div className="pv2-info-field">
                    <div className="pv2-info-field-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div>
                      <div className="pv2-info-field-label">Fecha de nacimiento</div>
                      <div className="pv2-info-field-value">{birthFormatted}</div>
                    </div>
                  </div>

                  <div className="pv2-info-field">
                    <div className="pv2-info-field-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    </div>
                    <div>
                      <div className="pv2-info-field-label">Sexo</div>
                      <div className="pv2-info-field-value">{userProfile?.persona?.sexo || '—'}</div>
                    </div>
                  </div>

                  <div className="pv2-info-field">
                    <div className="pv2-info-field-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div>
                      <div className="pv2-info-field-label">Dirección</div>
                      <div className="pv2-info-field-value">{userProfile?.persona?.direccion || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
