import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';

import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // If no email in URL, redirect back to register
      navigate('/register');
    }
  }, [location, navigate]);

  const handleVerifyRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/register-verify', {
        method: 'POST',
        body: JSON.stringify({
          correo_institucional: email,
          otp: otp.trim()
        })
      });
      toast.success('¡Registro completado! Su cuenta ha sido verificada y activada exitosamente.');
      navigate('/login');
    } catch (err) {
      const msg = err.message || 'El código de seguridad es incorrecto o ha expirado.';
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

        <h2>Verifica tu Correo</h2>
        <p className="auth-card-subtitle">
          Hemos enviado un código de 6 dígitos a <strong>{email}</strong>.
        </p>

        <form onSubmit={handleVerifyRegister} className="auth-form" style={{ marginTop: 20 }}>
          <label>
            Código de Seguridad
            <input type="text" required placeholder="Ej: 123456" maxLength={6} style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px' }}
              value={otp} onChange={e => setOtp(e.target.value)}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Confirmando...' : 'Confirmar Registro'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/register" className="auth-link">
            Volver al registro
          </Link>
        </div>
      </div>
    </div>
  );
}
