
import React, { useState, useEffect, useMemo } from 'react';
import { Route, Routes, useNavigate, Navigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://projectdb-sistema-hospitalario-production.up.railway.app';

async function api(path, options = {}) {
  const { headers, ...restOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || 'No se pudo completar la solicitud.');
  }

  return data;
}



function ProtectedRoute({ children }) {
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
    return <div className="auth-shell"><div className="auth-card"><p className="muted-text">Verificando sesión…</p></div></div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}



function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'doctor' });
  const [recoverMode, setRecoverMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          correo_institucional: form.email,
          contrasena: form.password,
        }),
      });

      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', data.token || '');
      localStorage.setItem('userRole', data.usuario?.rol?.nombre_rol || 'Usuario');
      localStorage.setItem('userName', data.usuario?.persona
        ? `${data.usuario.persona.nombre} ${data.usuario.persona.apellido}`
        : data.usuario?.correo_institucional || 'Usuario');

      navigate('/');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api('/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ correo_institucional: form.email }),
      });

      alert('Si el correo existe, se han enviado instrucciones para restablecer la contraseña.');
      setRecoverMode(false);
    } catch (err) {
      setError(err.message || 'No se pudo enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="logo">🏥 Medic DB</div>

        {!recoverMode ? (
          <>
            <h2>Iniciar Sesión</h2>
            <form onSubmit={handleLogin} className="auth-form">
              <label>
                Correo Institucional
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="admin@medic.com"
                  required
                />
              </label>

              <label>
                Contraseña
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </label>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Ingresando…' : 'Ingresar al Sistema'}
              </button>
            </form>

            {error ? <p className="error-text">{error}</p> : null}

            <p className="auth-link" onClick={() => setRecoverMode(true)}>
              ¿Olvidaste tu contraseña?
            </p>
          </>
        ) : (
          <>
            <h2>Recuperar Acceso</h2>
            <p className="muted-text">
              Ingresa tu DNI o correo. Te enviaremos instrucciones para restablecer tu contraseña.
            </p>
            <form onSubmit={handleRecover} className="auth-form">
              <label>
                Correo Institucional
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="admin@medic.com"
                  required
                />
              </label>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
            {error ? <p className="error-text">{error}</p> : null}

            <p className="auth-link" onClick={() => setRecoverMode(false)}>
              Volver a Iniciar Sesión
            </p>
          </>
        )}
      </div>
    </div>
  );
}



function DashboardPage() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'Usuario');
  const [activeView, setActiveView] = useState(() => {
    const role = localStorage.getItem('userRole') || '';
    return role === 'Paciente' ? 'profile-view' : 'dashboard-view';
  });
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'Usuario');
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [personas, setPersonas] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      return;
    }

    api('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (data) => {
        if (data?.id_persona) {
          try {
            const role = data?.rol || localStorage.getItem('userRole') || 'Usuario';
            if (role === 'Médico Especialista') {
              const doctorData = await api(`/doctor/${data.id_persona}`);
              data.persona = doctorData?.empleado?.persona;
              data.doctor = doctorData;
            } else {
              const personaData = await api(`/persona/${data.id_persona}`);
              data.persona = personaData;
            }
          } catch (error) {
            console.error('Error fetching persona details:', error);
          }
        }

        const nombre = data?.persona?.nombre
          ? `${data.persona.nombre} ${data.persona.apellido}`
          : data?.correo_institucional || 'Usuario';

        setUserProfile(data);
        setUserName(nombre);
        setUserRole(data?.rol || localStorage.getItem('userRole') || 'Usuario');
        localStorage.setItem('userEmail', data?.correo_institucional || '');
      })
      .catch(() => {
        // Si falla la verificación, se mantiene el valor ya guardado.
      });
  }, []);

  const fetchPersonas = async (term = '') => {
    const query = term.trim();
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const data = await api(`/persona${query ? `?search=${encodeURIComponent(query)}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPersonas(data || []);
    } catch (err) {
      console.error('Error al buscar personas:', err);
    } finally {
      setSearching(false);
      setLoadingPersonas(false);
    }
  };

  useEffect(() => {
    if (activeView === 'personas-view') {
      fetchPersonas();
    }
  }, [activeView]);

  const filteredPersonas = useMemo(() => {
    if (!searchTerm.trim()) return personas;
    const term = searchTerm.toLowerCase().trim();
    return personas.filter((persona) => {
      const nombreCompleto = `${persona.nombre || ''} ${persona.apellido || ''}`.toLowerCase();
      const dni = String(persona.dni || '').toLowerCase();

      return nombreCompleto.includes(term) || dni.includes(term);
    });
  }, [personas, searchTerm]);

  const resumenTexto = searchTerm
    ? `Mostrando ${filteredPersonas.length} resultado${filteredPersonas.length === 1 ? '' : 's'} para “${searchTerm.trim()}”.`
    : `Mostrando todas las personas registradas (${personas.length}).`;

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    navigate('/login', { replace: true });
  };

  const [citas, setCitas] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [showNuevaCitaForm, setShowNuevaCitaForm] = useState(false);
  const [nuevaCita, setNuevaCita] = useState({ id_doctor: '', fecha: '', hora: '' });

  useEffect(() => {
    if (activeView === 'citas-view') {
      const token = localStorage.getItem('token');
      api('/cita', { headers: { Authorization: `Bearer ${token}` } }).then(data => setCitas(data || []));
      api('/doctor', { headers: { Authorization: `Bearer ${token}` } }).then(data => setDoctores(data || []));
    }
  }, [activeView]);

  const handleAgendarCita = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        fecha: new Date(nuevaCita.fecha).toISOString(),
        hora: new Date(`${nuevaCita.fecha}T${nuevaCita.hora}:00`).toISOString(),
        estado: 'Pendiente',
        id_paciente: userProfile.id_persona,
        id_doctor: parseInt(nuevaCita.id_doctor, 10),
        id_consultorio: 1
      };
      await api('/cita', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      setShowNuevaCitaForm(false);
      const data = await api('/cita', { headers: { Authorization: `Bearer ${token}` } });
      setCitas(data || []);
      setNuevaCita({ id_doctor: '', fecha: '', hora: '' });
    } catch(err) {
      console.error(err);
      alert('Error al agendar cita');
    }
  };

  const misCitas = useMemo(() => {
    if (userRole === 'Médico Especialista') {
      return citas.filter(c => c.id_doctor === userProfile?.id_persona);
    } else if (userRole === 'Paciente') {
      return citas.filter(c => c.id_paciente === userProfile?.id_persona);
    }
    return citas; // Admin
  }, [citas, userRole, userProfile]);

  const horasDisponibles = useMemo(() => {
    if (!nuevaCita.id_doctor || !nuevaCita.fecha) return [];
    
    const slots = [];
    for (let h = 8; h <= 17; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const dateSelected = new Date(nuevaCita.fecha).toISOString().split('T')[0];
    const citasOcupadas = citas.filter(c => {
      if (!c.fecha) return false;
      const citaDate = new Date(c.fecha).toISOString().split('T')[0];
      return c.id_doctor === parseInt(nuevaCita.id_doctor, 10) && citaDate === dateSelected;
    });

    const horasOcupadas = citasOcupadas.map(c => {
      const d = new Date(c.hora);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    });

    return slots.filter(slot => !horasOcupadas.includes(slot));
  }, [nuevaCita.id_doctor, nuevaCita.fecha, citas]);

  const menuItems = useMemo(() => {
    const allItems = [
      { id: 'dashboard-view', label: '📊 Dashboard', roles: ['Administrador', 'Médico Especialista', 'Enfermería'] },
      { id: 'personas-view', label: '👥 Personas', roles: ['Administrador'] },
      { id: 'citas-view', label: '📅 Citas Médicas', roles: ['Administrador', 'Médico Especialista', 'Paciente'] },
      { id: 'profile-view', label: '👤 Perfil', roles: ['Administrador', 'Médico Especialista', 'Enfermería', 'Paciente'] },
      { id: 'clinico-view', label: '⚕️ Historial Clínico', roles: ['Administrador', 'Médico Especialista', 'Enfermería', 'Paciente'] }
    ];
    return allItems.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <h2>Medic DB</h2>
          <small>Sistema Hospitalario</small>
        </div>
        <nav>
          <ul>
            {menuItems.map(item => (
              <li key={item.id}>
                <button
                  className={`nav-btn ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => setActiveView(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Buscar por DNI o Nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn" onClick={() => fetchPersonas(searchTerm)}>Buscar</button>
          </div>
          <div className="user-profile">
            <div style={{ fontWeight: 600, color: 'var(--primary-deep)', fontSize: '1.2rem', padding: '0 8px' }}>
              👤
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong>{userName}</strong>
              <span className="role-chip">{userRole}</span>
            </div>
          </div>
          <button className="ghost-btn" onClick={handleLogout} style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}>
            Cerrar Sesión
          </button>
        </header>

        <div className="views-container">
          {activeView === 'dashboard-view' && (
            <div className="dashboard-grid">
              <div className="stat-card">
                <h3>Pacientes Hoy</h3>
                <p className="stat-value">24</p>
                <p className="stat-trend positive">↑ 12% vs ayer</p>
              </div>
              <div className="stat-card">
                <h3>Citas Pendientes</h3>
                <p className="stat-value">12</p>
                <p className="stat-trend">Ver agenda</p>
              </div>
              <div className="stat-card">
                <h3>Personal Activo</h3>
                <p className="stat-value">8</p>
                <p className="stat-trend">En turno</p>
              </div>
              <div className="stat-card">
                <h3>Ingresos Mes</h3>
                <p className="stat-value">S/ 45K</p>
                <p className="stat-trend positive">↑ 5% vs mes ant</p>
              </div>
            </div>
          )}

          {activeView === 'personas-view' && (
            <div className="view-module active">
              <div className="dashboard-hero">
                <div>
                  <h1>Directorio de Personas</h1>
                  <p>Busca y administra a todos los individuos registrados (Doctores, Pacientes, Empleados).</p>
                </div>
              </div>
              <p className="muted-text" style={{ textAlign: 'left', marginBottom: '15px' }}>{resumenTexto}</p>

              {loadingPersonas ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><p className="muted-text">Cargando directorio de personas...</p></div>
              ) : filteredPersonas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-soft)', borderRadius: '12px' }}>
                  <p className="muted-text">No se encontraron personas con esos criterios de búsqueda.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>DNI</th>
                        <th>Nombre Completo</th>
                        <th>Sexo</th>
                        <th>Teléfono</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPersonas.map((persona) => (
                        <tr key={persona.id_persona}>
                          <td style={{ fontWeight: 500 }}>{persona.dni}</td>
                          <td>{persona.nombre} {persona.apellido}</td>
                          <td>
                            <span className="badge" style={{ backgroundColor: persona.sexo === 'Masculino' ? '#e0f2fe' : '#fce7f3', color: persona.sexo === 'Masculino' ? '#0369a1' : '#be185d' }}>
                              {persona.sexo}
                            </span>
                          </td>
                          <td>{persona.telefono}</td>
                          <td><button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Ver Detalle</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeView === 'citas-view' && (
            <div className="view-module active">
              <div className="dashboard-hero">
                <div>
                  <h1>Citas Médicas</h1>
                  <p>Gestiona y consulta tu agenda médica.</p>
                </div>
                {userRole === 'Paciente' && (
                  <button className="btn" style={{ width: 'auto' }} onClick={() => setShowNuevaCitaForm(!showNuevaCitaForm)}>
                    {showNuevaCitaForm ? 'Cancelar' : '+ Agendar Nueva Cita'}
                  </button>
                )}
              </div>

              {showNuevaCitaForm && userRole === 'Paciente' && (
                <div className="panel-card" style={{ marginBottom: '20px' }}>
                  <h3 style={{ marginBottom: '15px' }}>Agendar Nueva Cita</h3>
                  <form onSubmit={handleAgendarCita} style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', fontWeight: 600, flex: 1 }}>
                      Doctor
                      <select required value={nuevaCita.id_doctor} onChange={e => setNuevaCita({...nuevaCita, id_doctor: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <option value="">Seleccione un doctor</option>
                        {doctores.map(doc => (
                          <option key={doc.id_persona} value={doc.id_persona}>
                            {doc.empleado?.persona?.nombre} {doc.empleado?.persona?.apellido} - {doc.especialidad?.nombre_especialidad}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', fontWeight: 600, flex: 1 }}>
                      Fecha
                      <input type="date" required value={nuevaCita.fecha} onChange={e => setNuevaCita({...nuevaCita, fecha: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', fontWeight: 600, flex: 1 }}>
                      Hora
                      <select required value={nuevaCita.hora} onChange={e => setNuevaCita({...nuevaCita, hora: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} disabled={!nuevaCita.id_doctor || !nuevaCita.fecha}>
                        <option value="">{(!nuevaCita.id_doctor || !nuevaCita.fecha) ? 'Elija doctor y fecha' : 'Seleccione una hora'}</option>
                        {horasDisponibles.map(hora => (
                          <option key={hora} value={hora}>{hora}</option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="btn" style={{ width: 'auto', minWidth: '150px' }}>Confirmar Cita</button>
                  </form>
                </div>
              )}

              {misCitas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-soft)', borderRadius: '12px' }}>
                  <p className="muted-text">No hay citas registradas.</p>
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--line)', color: 'var(--text-dark)' }}>
                        <th style={{ padding: '12px', fontWeight: 700 }}>Fecha y Hora</th>
                        <th style={{ padding: '12px', fontWeight: 700 }}>Doctor</th>
                        <th style={{ padding: '12px', fontWeight: 700 }}>Especialidad</th>
                        <th style={{ padding: '12px', fontWeight: 700 }}>Paciente</th>
                        <th style={{ padding: '12px', fontWeight: 700 }}>Consultorio</th>
                        <th style={{ padding: '12px', fontWeight: 700 }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {misCitas.map((cita) => {
                        const date = new Date(cita.fecha).toLocaleDateString();
                        const time = new Date(cita.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        return (
                          <tr key={cita.id_cita} style={{ borderBottom: '1px solid var(--line)', transition: 'background 0.2s', ':hover': { background: 'var(--surface-soft)' } }}>
                            <td style={{ padding: '16px 12px', fontWeight: 600 }}>{date} <span style={{ color: 'var(--text-light)', fontWeight: 400, marginLeft: '4px' }}>{time}</span></td>
                            <td style={{ padding: '16px 12px' }}>{cita.doctor?.empleado?.persona?.nombre} {cita.doctor?.empleado?.persona?.apellido}</td>
                            <td style={{ padding: '16px 12px' }}>{cita.doctor?.especialidad?.nombre_especialidad}</td>
                            <td style={{ padding: '16px 12px' }}>{cita.paciente?.persona?.nombre} {cita.paciente?.persona?.apellido}</td>
                            <td style={{ padding: '16px 12px' }}>{cita.consultorio?.nombre_consultorio || `Cons. ${cita.id_consultorio}`}</td>
                            <td style={{ padding: '16px 12px' }}>
                              <span className="pill-badge">
                                {cita.estado}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeView === 'profile-view' && (
            <div className="view-module active">
              <div className="dashboard-hero">
                <h1>Mi Perfil</h1>
              </div>
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', 
                overflow: 'hidden',
                maxWidth: '600px'
              }}>
                <div style={{ backgroundColor: '#1E3A8A', padding: '30px', color: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    width: '80px', height: '80px', 
                    backgroundColor: 'white', color: '#1E3A8A', 
                    borderRadius: '50%', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', 
                    fontSize: '2rem', fontWeight: 'bold' 
                  }}>
                    {userProfile?.persona?.nombre?.charAt(0) || userProfile?.correo_institucional?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                      {userProfile?.persona ? `${userProfile.persona.nombre} ${userProfile.persona.apellido}` : 'Usuario'}
                    </h3>
                    <p style={{ margin: 0, opacity: 0.8 }}>{userRole}</p>
                    {userProfile?.doctor?.especialidad && (
                      <p style={{ margin: '5px 0 0 0', fontWeight: 600, color: '#e0f2fe' }}>
                        Especialidad: {userProfile.doctor.especialidad.nombre_especialidad}
                      </p>
                    )}
                  </div>
                </div>
                
                <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <p className="muted-text" style={{ fontSize: '0.85rem', marginBottom: '5px' }}>Correo Electrónico</p>
                    <p style={{ fontWeight: 500 }}>{userProfile?.correo_institucional || '---'}</p>
                  </div>
                  <div>
                    <p className="muted-text" style={{ fontSize: '0.85rem', marginBottom: '5px' }}>DNI</p>
                    <p style={{ fontWeight: 500 }}>{userProfile?.persona?.dni || '---'}</p>
                  </div>
                  <div>
                    <p className="muted-text" style={{ fontSize: '0.85rem', marginBottom: '5px' }}>Teléfono</p>
                    <p style={{ fontWeight: 500 }}>{userProfile?.persona?.telefono || '---'}</p>
                  </div>
                  <div>
                    <p className="muted-text" style={{ fontSize: '0.85rem', marginBottom: '5px' }}>Sexo</p>
                    <p style={{ fontWeight: 500 }}>{userProfile?.persona?.sexo || '---'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p className="muted-text" style={{ fontSize: '0.85rem', marginBottom: '5px' }}>Dirección</p>
                    <p style={{ fontWeight: 500 }}>{userProfile?.persona?.direccion || '---'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p className="muted-text" style={{ fontSize: '0.85rem', marginBottom: '5px' }}>Fecha de Nacimiento</p>
                    <p style={{ fontWeight: 500 }}>
                      {userProfile?.persona?.fecha_nacimiento 
                        ? new Date(userProfile.persona.fecha_nacimiento).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) 
                        : '---'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'clinico-view' && (
            <article className="view-module active">
              <div className="dashboard-hero">
                <div>
                  <h1>Historial Clínico</h1>
                  <p>Registro de DIAGNÓSTICOS, TRATAMIENTOS y RECETAS.</p>
                </div>
              </div>
              <div className="panel-card" style={{ padding: '40px', textAlign: 'center' }}>
                <p className="muted-text">Módulo en construcción...</p>
              </div>
            </article>
          )}
        </div>
      </main>
    </div>
  );
}


export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
