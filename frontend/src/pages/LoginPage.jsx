import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
export default function LoginPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode]       = useState('login'); // 'login' | 'recover' | 'register'
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Login y Recuperación form
  const [form, setForm]               = useState({ email: '', password: '' });

  // Registro form (Pacientes)
  const [regForm, setRegForm] = useState({
    nombre: '', apellido: '', dni: '', telefono: '', email: '', password: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          correo_institucional: form.email,
          contrasena: form.password
        })
      });
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', data.token || '');
      localStorage.setItem('userRole', data.usuario?.rol?.nombre_rol || 'Usuario');
      localStorage.setItem('userName', data.usuario?.persona
        ? `${data.usuario.persona.nombre} ${data.usuario.persona.apellido}`
        : data.usuario?.correo_institucional || 'Usuario');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Credenciales inválidas. Verifique su correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ correo_institucional: form.email })
      });
      
      if (data.resetLinkFallback) {
        toast.success(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Recuperación Interna</span>
            <span style={{ color: '#475569' }}>Acceda al enlace para restablecer su contraseña:</span>
            <a href={`https://projectdb-sistema-hospitalario-production.up.railway.app${data.resetLinkFallback}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all' }}>Abrir Enlace</a>
          </div>,
          { duration: 15000 }
        );
      } else {
        toast.success('Las instrucciones de recuperación han sido enviadas a su correo electrónico de forma segura.');
      }
      
      setViewMode('login');
    } catch (err) {
      const msg = err.message || 'No se pudo enviar el correo de recuperación.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ width: 'min(380px, 90vw)' }}>
        <div className="auth-logo-wrapper">
          <div className="auth-logo-icon"></div>
        </div>

        {viewMode === 'login' && (
          <>
            <h2 style={{ color: '#0F172A', fontWeight: 800, letterSpacing: '-0.5px' }}>EsSalud<span style={{ color: '#2563EB' }}>+</span></h2>
            <p className="auth-card-subtitle" style={{ color: '#64748B', fontSize: '0.95rem' }}>Plataforma Hospitalaria Integral</p>

            <form onSubmit={handleLogin} className="auth-form">
              <label>
                Correo Electrónico
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@medic.com"
                  required
                  autoComplete="email"
                />
              </label>

              <label>
                Contraseña
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </label>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Autenticando...' : 'Ingresar al Sistema'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, textAlign: 'center' }}>
              <p className="auth-link" onClick={() => { setViewMode('recover'); setError(''); }}>
                ¿Olvidó su contraseña?
              </p>
              <div style={{ width: '100%', height: 1, background: 'var(--slate-200)', margin: '4px 0' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: 0 }}>
                ¿Es paciente nuevo?
              </p>
              <Link 
                to="/register"
                className="btn-secondary" 
                style={{ padding: '8px', fontSize: '0.85rem', borderRadius: 8, display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
              >
                Regístrate aquí
              </Link>
            </div>
          </>
        )}

        {viewMode === 'recover' && (
          <>
            <h2>Recuperar Acceso</h2>
            <p className="auth-card-subtitle">
              Ingrese su correo para recibir instrucciones.
            </p>

            <form onSubmit={handleRecover} className="auth-form">
              <label>
                Correo Electrónico
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@medic.com"
                  required
                />
              </label>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Instrucciones'}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <p className="auth-link" onClick={() => { setViewMode('login'); setError(''); }}>
                Volver al inicio de sesión
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
