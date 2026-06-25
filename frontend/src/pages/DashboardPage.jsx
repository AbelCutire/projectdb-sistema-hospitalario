import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import DashboardView from '../views/DashboardView';
import PersonasView from '../views/PersonasView';
import CitasView from '../views/CitasView';
import ProfileView from '../views/ProfileView';
import ClinicoView from '../views/ClinicoView';

const NAV_ICONS = {
  'dashboard-view': '',
  'personas-view':  '',
  'citas-view':     '',
  'profile-view':   '',
  'clinico-view':   ''
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [userRole, setUserRole]       = useState(localStorage.getItem('userRole') || 'Usuario');
  const [activeView, setActiveView]   = useState('dashboard-view');
  const [userName, setUserName]       = useState(localStorage.getItem('userName') || 'Usuario');
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [personas, setPersonas]       = useState([]);
  const [searching, setSearching]     = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    api('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (data) => {
        // data ya contiene id_usuario, id_persona, rol, persona (gracias al fix del backend)
        const role = data?.rol || localStorage.getItem('userRole') || 'Usuario';

        if (role === 'Médico Especialista' && data?.id_persona) {
          try {
            const doctorData = await api(`/doctor/${data.id_persona}`, { headers: { Authorization: `Bearer ${token}` } });
            // Mantener el id_usuario del token, y agregar datos del doctor
            data.doctor  = doctorData;
            data.persona = doctorData?.empleado?.persona || data.persona;
          } catch (err) {
            console.error('Error al obtener datos del doctor:', err);
          }
        }

        const nombre = data?.persona?.nombre
          ? `${data.persona.nombre} ${data.persona.apellido}`
          : data?.correo_institucional || 'Usuario';

        setUserProfile(data);
        setUserName(nombre);
        setUserRole(role);
        localStorage.setItem('userEmail', data?.correo_institucional || '');
      })
      .catch(() => {});
  }, []);

  const fetchPersonas = async (term = '') => {
    const query = term.trim();
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const data  = await api(`/persona${query ? `?search=${encodeURIComponent(query)}` : ''}`, {
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
    if (activeView === 'personas-view') fetchPersonas();
  }, [activeView]);

  const filteredPersonas = useMemo(() => {
    if (!searchTerm.trim()) return personas;
    const term = searchTerm.toLowerCase().trim();
    return personas.filter((p) => {
      const full = `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase();
      const dni  = String(p.dni || '').toLowerCase();
      return full.includes(term) || dni.includes(term);
    });
  }, [personas, searchTerm]);

  const resumenTexto = searchTerm
    ? `${filteredPersonas.length} resultado${filteredPersonas.length === 1 ? '' : 's'} para "${searchTerm.trim()}"`
    : `${personas.length} personas registradas`;

  const handleProfileUpdate = (updatedPersona) => {
    setUserProfile((prev) => prev ? { ...prev, persona: updatedPersona } : null);
    setUserName(`${updatedPersona.nombre} ${updatedPersona.apellido}`);
    localStorage.setItem('userName', `${updatedPersona.nombre} ${updatedPersona.apellido}`);
  };

  const handleLogout = () => {
    ['isAuthenticated', 'token', 'userRole', 'userName', 'userEmail'].forEach(k =>
      localStorage.removeItem(k)
    );
    navigate('/login', { replace: true });
  };

  const menuItems = useMemo(() => {
    const all = [
      { id: 'dashboard-view', label: 'Inicio',            roles: ['Administrador', 'Médico Especialista', 'Enfermería', 'Paciente'] },
      { id: 'personas-view',  label: 'Personas',          roles: ['Administrador'] },
      { id: 'citas-view',     label: 'Citas Médicas',     roles: ['Administrador', 'Médico Especialista', 'Paciente'] },
      { id: 'clinico-view',   label: 'Historial Clínico', roles: ['Administrador', 'Médico Especialista', 'Paciente'] },
      { id: 'profile-view',   label: 'Perfil',            roles: ['Administrador', 'Médico Especialista', 'Enfermería', 'Paciente'] },
    ];
    return all.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  // Initials from username
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">
            <div className="logo-icon"></div>
            <h2>MedicDB</h2>
          </div>
          <small>Sistema Hospitalario</small>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-label">Navegación</span>
            {menuItems.map(item => (
              <button
                key={item.id}
                className={`nav-btn ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
              >
                <span className="nav-btn-icon">{NAV_ICONS[item.id]}</span>
                <span className="nav-btn-text">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* ── Main Content ─────────────────────────────── */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            {userRole === 'Administrador' && (
              <>
                <div className="topbar-search">
                  <input
                    type="text"
                    placeholder="Buscar persona por nombre o DNI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchPersonas(searchTerm)}
                  />
                </div>
                <button
                  className="topbar-btn-search"
                  onClick={() => fetchPersonas(searchTerm)}
                >
                  Buscar
                </button>
              </>
            )}
          </div>

          <div className="topbar-right">
            <div
              className="user-chip"
              onClick={() => setActiveView('profile-view')}
            >
              <div className="user-chip-avatar">{initials}</div>
              <div>
                <div className="user-chip-name">{userName}</div>
                <div className="user-chip-role">{userRole}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Views */}
        <div className="views-container">
          {activeView === 'dashboard-view' && (
            <DashboardView userRole={userRole} userProfile={userProfile} />
          )}

          {activeView === 'personas-view' && (
            <PersonasView
              loadingPersonas={loadingPersonas}
              filteredPersonas={filteredPersonas}
              resumenTexto={resumenTexto}
            />
          )}

          {activeView === 'citas-view' && (
            <CitasView userRole={userRole} userProfile={userProfile} />
          )}

          {activeView === 'clinico-view' && (
            <ClinicoView userRole={userRole} userProfile={userProfile} />
          )}

          {activeView === 'profile-view' && (
            <ProfileView
              userProfile={userProfile}
              userRole={userRole}
              onProfileUpdate={handleProfileUpdate}
              onLogout={handleLogout}
            />
          )}
        </div>
      </main>
    </div>
  );
}
