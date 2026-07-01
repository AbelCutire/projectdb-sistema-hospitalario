import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [regForm, setRegForm] = useState({
    nombre: '', apellido: '', dni: '', telefono: '', email: '', password: '', sexo: ''
  });

  const handleRequestRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/register-request', {
        method: 'POST',
        body: JSON.stringify({
          nombre: regForm.nombre,
          apellido: regForm.apellido,
          dni: regForm.dni,
          telefono: regForm.telefono,
          correo_institucional: regForm.email,
          contrasena: regForm.password,
          sexo: regForm.sexo
        })
      });
      
      if (data.otpFallback) {
        alert(`Aviso del Sistema:\n\nSe ha habilitado la verificación interna. Su código de seguridad temporal es: ${data.otpFallback}\n\nPor favor, introdúzcalo en la siguiente pantalla para validar su identidad.`);
      }
      
      // Redirect to verify page with email in query string
      navigate(`/verify-email?email=${encodeURIComponent(regForm.email)}`);
    } catch (err) {
      setError(err.message || 'Error al solicitar registro. Verifique sus datos o el correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ width: 'min(460px, 90vw)' }}>
        <div className="auth-logo-wrapper">
          <div className="auth-logo-icon"></div>
        </div>

        <h2>Registro de Pacientes</h2>
        <p className="auth-card-subtitle">Cree su cuenta para agendar citas y ver sus recetas</p>

        <form onSubmit={handleRequestRegister} className="auth-form" style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Nombres
              <input type="text" required style={{ width: '100%', boxSizing: 'border-box' }}
                minLength={2} pattern="[A-Za-zÁ-Úá-úñÑ ]+" title="Solo letras"
                value={regForm.nombre} onChange={e => setRegForm(p => ({ ...p, nombre: e.target.value }))}
              />
            </label>
            <label>
              Apellidos
              <input type="text" required style={{ width: '100%', boxSizing: 'border-box' }}
                minLength={2} pattern="[A-Za-zÁ-Úá-úñÑ ]+" title="Solo letras"
                value={regForm.apellido} onChange={e => setRegForm(p => ({ ...p, apellido: e.target.value }))}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              DNI / Carnet
              <input type="text" required style={{ width: '100%', boxSizing: 'border-box' }}
                minLength={8} maxLength={12} pattern="[0-9A-Za-z]+" title="Ingrese un documento válido"
                value={regForm.dni} onChange={e => setRegForm(p => ({ ...p, dni: e.target.value }))}
              />
            </label>
            <label>
              Teléfono (Móvil)
              <input type="tel" required style={{ width: '100%', boxSizing: 'border-box' }}
                minLength={9} maxLength={15} pattern="[0-9\-\+ ]+" title="Ingrese un número de teléfono válido"
                value={regForm.telefono} onChange={e => setRegForm(p => ({ ...p, telefono: e.target.value }))}
              />
            </label>
          </div>

          <label>
            Sexo
            <select required style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid var(--slate-300)', backgroundColor: 'white', color: 'var(--slate-800)', fontFamily: 'inherit' }}
              value={regForm.sexo} onChange={e => setRegForm(p => ({ ...p, sexo: e.target.value }))}
            >
              <option value="" disabled>Seleccione...</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
            </select>
          </label>

          <label>
            Correo Electrónico Válido
            <input type="email" required placeholder="ejemplo@correo.com" style={{ width: '100%', boxSizing: 'border-box' }}
              pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$" title="Ingrese un correo electrónico válido"
              value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value.toLowerCase() }))}
            />
          </label>

          <label>
            Contraseña
            <input type="password" required placeholder="Mínimo 8 caracteres" minLength={8} style={{ width: '100%', boxSizing: 'border-box' }}
              value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Validando...' : 'Crear Cuenta'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: 0 }}>
            ¿Ya tiene cuenta?
          </p>
          <Link to="/login" className="auth-link" style={{ display: 'inline-block', marginTop: '4px' }}>
            Inicie sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
