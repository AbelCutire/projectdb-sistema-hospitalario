import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../services/api';

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      localStorage.removeItem('isAuthenticated');
      setIsAuthenticated(false);
      setChecking(false);
      return;
    }

    api('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        localStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="muted-text">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
