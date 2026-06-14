import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://projectdb-sistema-hospitalario-production.up.railway.app';

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
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

              <label>
                Simular ingreso como:
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                >
                  <option value="doctor">Médico</option>
                  <option value="enfermera">Enfermera</option>
                  <option value="admin">Administrativo</option>
                  <option value="paciente">Paciente</option>
                </select>
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
  const [activeView, setActiveView] = useState('dashboard-view');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'Usuario');
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'Usuario');
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
      .then((data) => {
        const nombre = data?.persona
          ? `${data.persona.nombre} ${data.persona.apellido}`
          : data?.correo_institucional || 'Usuario';

        setUserProfile(data);
        setUserName(nombre);
        setUserRole(data?.rol?.nombre_rol || localStorage.getItem('userRole') || 'Usuario');
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
      const data = await api(`/persona${query ? `?search=${encodeURIComponent(query)}` : ''}`);
      setPersonas(Array.isArray(data) ? data : []);
    } catch (error) {
      setPersonas([]);
      console.error('No se pudo cargar el listado de personas:', error);
    } finally {
      setSearching(false);
      setLoadingPersonas(false);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    setActiveView('pacientes-view');
    await fetchPersonas(searchTerm);
  };

  const term = searchTerm.trim().toLowerCase();

  const filteredPersonas = useMemo(() => {
    if (!term) return personas;

    return personas.filter((persona) => {
      const nombreCompleto = `${persona.nombre || ''} ${persona.apellido || ''}`.toLowerCase();
      const dni = String(persona.dni || '').toLowerCase();

      return nombreCompleto.includes(term) || dni.includes(term);
    });
  }, [personas, term]);

  const resumenTexto = term
    ? `Mostrando ${filteredPersonas.length} resultado${filteredPersonas.length === 1 ? '' : 's'} para “${searchTerm.trim()}”.`
    : `Mostrando todas las personas registradas (${personas.length}).`;

  const menuItems = useMemo(
    () => [
      { id: 'dashboard-view', label: '📊 Dashboard' },
      { id: 'pacientes-view', label: '👥 Pacientes' },
      { id: 'profile-view', label: '👤 Perfil' },
      { id: 'citas-view', label: '📅 Citas Médicas' },
      { id: 'clinico-view', label: '⚕️ Historial Clínico' },
    ],
    []
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          <h2>Medic DB</h2>
        </div>
        <nav>
          <ul>
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
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

      <main className="main-content">
        <header className="topbar">
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch(event);
                }
              }}
              placeholder="Buscar por DNI o Nombre..."
            />
            <button type="submit" className="btn" disabled={searching}>
              {searching ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          <button
            type="button"
            className="user-profile"
            onClick={() => setActiveView('profile-view')}
            aria-label="Ver perfil del usuario"
          >
            <span>👤 {userName}</span>
            <small className="role-chip">{userRole}</small>
          </button>
        </header>

        <section className="views-container">
          <article className={`view-module ${activeView === 'dashboard-view' ? 'active' : ''}`}>
            <div className="dashboard-hero">
              <div>
                <h1>Panel General</h1>
                <p>Bienvenido al sistema hospitalario. Aquí puedes ver un resumen rápido y acceder al directorio completo de personas.</p>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setActiveView('pacientes-view')}>
                Ver directorio completo
              </button>
            </div>

            <div className="dashboard-grid">
              <article className="stat-card accent-blue">
                <span>Total personas</span>
                <strong>{personas.length}</strong>
                <small>Listado completo desde el backend.</small>
              </article>
              <article className="stat-card accent-green">
                <span>Resultados mostrados</span>
                <strong>{filteredPersonas.length}</strong>
                <small>{searchTerm ? 'Filtrados por la búsqueda actual.' : 'Sin filtro aplicado.'}</small>
              </article>
              <article className="stat-card accent-purple">
                <span>Estado del panel</span>
                <strong>{loadingPersonas ? 'Cargando…' : 'Activo'}</strong>
                <small>Datos sincronizados con Railway.</small>
              </article>
            </div>

            <article className="panel-card">
              <div className="panel-header">
                <div>
                  <h2>Vista rápida</h2>
                  <p>{resumenTexto}</p>
                </div>
                <button type="button" className="ghost-btn" onClick={() => { setSearchTerm(''); fetchPersonas(); }}>
                  Mostrar todo
                </button>
              </div>

              <div className="list-card">
                {loadingPersonas ? (
                  <p className="muted-text">Cargando personas desde el backend…</p>
                ) : filteredPersonas.length === 0 ? (
                  <p className="muted-text">No se encontraron personas con ese criterio.</p>
                ) : (
                  filteredPersonas.slice(0, 6).map((persona) => (
                    <article key={persona.id_persona} className="person-card">
                      <div>
                        <strong>{persona.nombre} {persona.apellido}</strong>
                        <span>DNI: {persona.dni}</span>
                      </div>
                      <small>{persona.telefono || 'Sin teléfono registrado'}</small>
                    </article>
                  ))
                )}
              </div>
            </article>
          </article>

          <article className={`view-module ${activeView === 'pacientes-view' ? 'active' : ''}`}>
            <div className="panel-header">
              <div>
                <h1>Directorio de Pacientes</h1>
                <p>Busca por nombre o DNI y consulta el listado real de personas del sistema.</p>
              </div>
              <span className="pill-badge">{filteredPersonas.length} personas</span>
            </div>

            <div className="list-card">
              {loadingPersonas ? (
                <p className="muted-text">Cargando personas desde el backend…</p>
              ) : filteredPersonas.length === 0 ? (
                <p className="muted-text">No se encontraron personas con ese criterio.</p>
              ) : (
                filteredPersonas.map((persona) => (
                  <article key={persona.id_persona} className="person-card large">
                    <div>
                      <strong>{persona.nombre} {persona.apellido}</strong>
                      <span>DNI: {persona.dni}</span>
                      <small>Teléfono: {persona.telefono || 'Sin registro'}</small>
                    </div>
                    <div className="person-meta">
                      <span className="mini-tag">Paciente</span>
                      <span className="mini-tag">ID {persona.id_persona}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className={`view-module ${activeView === 'profile-view' ? 'active' : ''}`}>
            <div className="dashboard-hero">
              <div>
                <h1>Perfil del usuario</h1>
                <p>Consulta tus datos personales y de acceso desde esta vista dedicada.</p>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setActiveView('dashboard-view')}>
                Volver al dashboard
              </button>
            </div>

            <div className="profile-grid">
              <article className="profile-card">
                <span className="eyebrow">Usuario</span>
                <h2>{userName}</h2>
                <p>{userProfile?.correo_institucional || localStorage.getItem('userEmail') || 'Correo no disponible'}</p>
              </article>

              <article className="profile-card">
                <span className="eyebrow">Rol</span>
                <h2>{userRole}</h2>
                <p>Acceso actual del panel de control.</p>
              </article>

              <article className="profile-card wide">
                <span className="eyebrow">Datos personales</span>
                <ul className="profile-list">
                  <li><strong>Nombre completo:</strong> {userProfile?.persona?.nombre || '—'} {userProfile?.persona?.apellido || ''}</li>
                  <li><strong>DNI:</strong> {userProfile?.persona?.dni || '—'}</li>
                  <li><strong>Teléfono:</strong> {userProfile?.persona?.telefono || '—'}</li>
                  <li><strong>Fecha de nacimiento:</strong> {userProfile?.persona?.fecha_nacimiento || '—'}</li>
                  <li><strong>Dirección:</strong> {userProfile?.persona?.direccion || '—'}</li>
                </ul>
              </article>
            </div>
          </article>

          <article className={`view-module ${activeView === 'citas-view' ? 'active' : ''}`}>
            <h1>Gestión de Citas</h1>
            <p>Módulo para programar y revisar la entidad CITA.</p>
          </article>

          <article className={`view-module ${activeView === 'clinico-view' ? 'active' : ''}`}>
            <h1>Historial y Atención</h1>
            <p>Registro de DIAGNÓSTICOS, TRATAMIENTOS y RECETAS.</p>
          </article>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
