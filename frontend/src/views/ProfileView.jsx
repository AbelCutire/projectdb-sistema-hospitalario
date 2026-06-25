import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? '' : dt.toISOString().split('T')[0];
};

export default function ProfileView({ userProfile, userRole, onProfileUpdate, onLogout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData]   = useState({
    nombre: '', apellido: '', dni: '', telefono: '', direccion: '', sexo: 'Masculino', fecha_nacimiento: ''
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

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

  const displayName = nombre
    ? `${nombre} ${apellido}`
    : userProfile?.correo_institucional || 'Usuario';

  return (
    <div>
      <div className="page-header">
        <h1>Perfil</h1>
        <p>Administra tu información personal y preferencias de cuenta.</p>
      </div>

      <div className="profile-shell">
        {/* ── Panel izquierdo ─────────────────────── */}
        <div className="profile-side">
          <div className="profile-side-card">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-name">{displayName}</div>
            <div className="profile-role-tag">{userRole}</div>

            {userProfile?.doctor?.especialidad && (
              <div className="profile-specialty-tag">
                {userProfile.doctor.especialidad.nombre_especialidad}
              </div>
            )}

            {onLogout && (
              <button className="profile-logout-btn" onClick={onLogout}>
                Cerrar Sesión
              </button>
            )}

            <div className="profile-footer-note">
              MedicDB · Sistema Hospitalario<br />
              <span style={{ opacity: 0.5 }}>Control Interno</span>
            </div>
          </div>
        </div>

        {/* ── Panel derecho ───────────────────────── */}
        <div className="profile-main">
          <div className="profile-main-card">
            <div className="profile-main-header">
              <div className="profile-main-title">
                {isEditing ? 'Editar Información' : 'Datos del Perfil'}
              </div>
              {!isEditing && (
                <button
                  className="profile-edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  ✎ Editar Perfil
                </button>
              )}
            </div>

            <div className="profile-main-body">
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="profile-fields-grid">
                    <div className="profile-field">
                      <span className="profile-field-label">Nombres</span>
                      <input
                        type="text" name="nombre" required
                        className="profile-field-input"
                        value={formData.nombre}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="profile-field">
                      <span className="profile-field-label">Apellidos</span>
                      <input
                        type="text" name="apellido" required
                        className="profile-field-input"
                        value={formData.apellido}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="profile-field">
                      <span className="profile-field-label">DNI</span>
                      <input
                        type="text" name="dni" required
                        className="profile-field-input"
                        value={formData.dni}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="profile-field">
                      <span className="profile-field-label">Teléfono</span>
                      <input
                        type="text" name="telefono" required
                        className="profile-field-input"
                        value={formData.telefono}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="profile-field">
                      <span className="profile-field-label">Sexo</span>
                      <select
                        name="sexo" required
                        className="profile-field-select"
                        value={formData.sexo}
                        onChange={handleChange}
                      >
                        <option value="" disabled>Seleccione...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                      </select>
                    </div>
                    <div className="profile-field">
                      <span className="profile-field-label">Fecha de Nacimiento</span>
                      <input
                        type="date" name="fecha_nacimiento" required
                        className="profile-field-input"
                        value={formData.fecha_nacimiento}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="profile-field full">
                      <span className="profile-field-label">Dirección</span>
                      <input
                        type="text" name="direccion" required
                        className="profile-field-input"
                        value={formData.direccion}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {error && (
                    <p style={{ color: 'var(--red-500)', fontSize: '0.875rem', marginTop: 16 }}>{error}</p>
                  )}

                  <div className="profile-form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-fields-grid">
                  <div className="profile-field full">
                    <span className="profile-field-label">Correo Institucional</span>
                    <span className="profile-field-value" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                      {userProfile?.correo_institucional || '—'}
                    </span>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">DNI</span>
                    <span className="profile-field-value">{userProfile?.persona?.dni || '—'}</span>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">Teléfono</span>
                    <span className="profile-field-value">{userProfile?.persona?.telefono || '—'}</span>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">Sexo</span>
                    <span className="profile-field-value">
                      {userProfile?.persona?.sexo ? (
                        <span className={`badge ${userProfile.persona.sexo === 'Masculino' ? 'badge-blue' : 'badge-violet'}`}>
                          {userProfile.persona.sexo}
                        </span>
                      ) : '—'}
                    </span>
                  </div>

                  <div className="profile-field">
                    <span className="profile-field-label">Fecha de Nacimiento</span>
                    <span className="profile-field-value">
                      {userProfile?.persona?.fecha_nacimiento
                        ? new Date(userProfile.persona.fecha_nacimiento).toLocaleDateString('es-ES', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })
                        : '—'}
                    </span>
                  </div>

                  <div className="profile-field full">
                    <span className="profile-field-label">Dirección</span>
                    <span className="profile-field-value">{userProfile?.persona?.direccion || '—'}</span>
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
