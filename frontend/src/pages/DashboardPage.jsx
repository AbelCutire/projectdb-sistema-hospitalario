import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import DashboardView from '../views/DashboardView';
import PersonasView from '../views/PersonasView';
import CitasView from '../views/CitasView';
import ProfileView from '../views/ProfileView';
import ClinicoView from '../views/ClinicoView';
import FarmaciaView from '../views/FarmaciaView';
import AuditoriaView from '../views/AuditoriaView';

// Map URL segment -> view id
const VIEW_MAP = {
  'inicio':    'dashboard-view',
  'personas':  'personas-view',
  'citas':     'citas-view',
  'historial': 'clinico-view',
  'farmacia':  'farmacia-view',
  'auditoria': 'auditoria-view',
  'perfil':    'profile-view',
};
const VIEW_REVERSE = Object.fromEntries(Object.entries(VIEW_MAP).map(([k, v]) => [v, k]));

const NAV_ICONS = {
  'dashboard-view': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  'personas-view': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  'citas-view': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  'clinico-view': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  'farmacia-view': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  'profile-view': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  'auditoria-view': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { view: viewParam } = useParams();

  const activeView = VIEW_MAP[viewParam] || 'dashboard-view';

  const setActiveView = (viewId) => {
    const segment = VIEW_REVERSE[viewId] || 'inicio';
    navigate(`/dashboard/${segment}`);
  };

  const [userRole, setUserRole]       = useState(localStorage.getItem('userRole') || 'Usuario');
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
        const role = data?.rol || localStorage.getItem('userRole') || 'Usuario';

        if (role === 'Médico Especialista' && data?.id_persona) {
          try {
            const doctorData = await api(`/doctor/${data.id_persona}`, { headers: { Authorization: `Bearer ${token}` } });
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
      { id: 'farmacia-view',  label: 'Farmacia',          roles: ['Administrador'] },
      { id: 'auditoria-view', label: 'Auditoría',         roles: ['Administrador'] },
      { id: 'profile-view',   label: 'Perfil',            roles: ['Administrador', 'Médico Especialista', 'Enfermería', 'Paciente'] },
    ];
    return all.filter(item => item.roles.includes(userRole));
  }, [userRole]);

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
          <div className="logo-mark" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', boxShadow: '0 4px 12px rgba(37,99,235,0.4)', borderRadius: 10 }}></div>
            <h2 style={{ color: '#ffffff', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>EsSalud<span style={{ color: '#60A5FA' }}>+</span></h2>
          </div>
          <small style={{ color: '#94A3B8', fontWeight: 600, letterSpacing: '1px', marginTop: 4, display: 'block', fontSize: '0.65rem' }}>SISTEMA HOSPITALARIO</small>
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
            {/* Search bar only shows in Personas view for admin */}
            {userRole === 'Administrador' && activeView === 'personas-view' && (
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

          {activeView === 'farmacia-view' && (
            <FarmaciaView />
          )}

          {activeView === 'auditoria-view' && (
            <AuditoriaView />
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
