import { useCallback, useEffect, useRef, useState } from 'react';
import { tourneeApi as realTourneeApi } from '../services/api';
import { mockTourneeApi } from '../mock/adminApi';
const _USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const _tourneeApi = _USE_MOCK ? mockTourneeApi : realTourneeApi;
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from './SidebarContext';
import { useAuth } from '../contexts/AuthContext';

// ── Icônes SVG inline ────────────────────────────────────────────────────────

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const MissionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const StockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const MapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);
const AuditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const WarehouseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <line x1="3" y1="9" x2="21" y2="9" />
  </svg>
);
const StatsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const CriseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const AlgoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const SupervisionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
  </svg>
);
const IncidentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const TruckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="2"/>
    <path d="M16 8l5 2v7h-5V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const DotsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const InboxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

// ── Types nav ────────────────────────────────────────────────────────────────

type NavItem = { name: string; icon: React.ReactNode; path: string; badge?: boolean };

const adminNavItems: NavItem[] = [
  { name: 'Vue d\'ensemble',  icon: <DashboardIcon />,    path: '/admin' },
  { name: 'Stock & Appro',    icon: <StockIcon />,        path: '/admin/stock' },
  { name: 'Flotte Véhicules', icon: <TruckIcon />,        path: '/admin/vehicules' },
  { name: 'Ordres Reçus',     icon: <InboxIcon />,        path: '/admin/ordres-recus', badge: true },
  { name: 'Missions',         icon: <MissionIcon />,      path: '/admin/tournees' },
  { name: 'Suivi Terrain',    icon: <MapIcon />,          path: '/admin/suivi' },
  { name: 'Paramètres',       icon: <SettingsIcon />,     path: '/admin/settings' },
];

const superAdminNavItems: NavItem[] = [
  { name: 'Vue globale',    icon: <DashboardIcon />,    path: '/superadmin' },
  { name: 'Crises',         icon: <CriseIcon />,        path: '/superadmin/crises' },
  { name: 'Pipeline Algo',  icon: <AlgoIcon />,         path: '/superadmin/pipeline' },
  { name: 'Supervision',    icon: <SupervisionIcon />,  path: '/superadmin/supervision' },
  { name: 'Incidents',      icon: <IncidentIcon />,     path: '/superadmin/incidents' },
  { name: 'Utilisateurs',   icon: <UsersIcon />,        path: '/superadmin/users' },
  { name: 'Audit Global',   icon: <AuditIcon />,        path: '/superadmin/audit' },
];

// ── Composant ────────────────────────────────────────────────────────────────

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { hasRole } = useAuth();
  const location = useLocation();
  const [ordresCount, setOrdresCount] = useState(0);

  const navItems = hasRole('SUPER_ADMIN') ? superAdminNavItems : adminNavItems;

  // Charge le nombre d'ordres "planifiée" pour le badge sidebar
  // Se rafraîchit au montage et à chaque changement de route (navigation entre pages)
  useEffect(() => {
    if (hasRole('SUPER_ADMIN')) return;
    _tourneeApi.getMine()
      .then((t: { statut: string }[]) => setOrdresCount(t.filter(x => x.statut === 'planifiee').length))
      .catch(() => setOrdresCount(0));
  // location.pathname → le badge se met à jour quand l'utilisateur navigue
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const isActive = useCallback(
    (path: string) => {
      // Les routes racines (/superadmin, /admin) : correspondance exacte uniquement
      if (path === '/superadmin' || path === '/admin') return location.pathname === path;
      return location.pathname === path || location.pathname.startsWith(path + '/');
    },
    [location.pathname],
  );

  const show = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? 'w-[290px]' : isHovered ? 'w-[290px]' : 'w-[90px]'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={`py-8 flex ${!show ? 'lg:justify-center' : 'justify-start'}`}>
        <Link to="/" className="flex items-center gap-2">
          {show ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg bg-white">
                <img 
                  src="/NAJDA_Logo.png" 
                  alt="NAJDA" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-bold text-brand-500 font-outfit tracking-tight">
                NAJDA
              </span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg bg-white">
              <img 
                src="/NAJDA_Logo.png" 
                alt="NAJDA" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav>
          <div className="mb-2">
            <h2 className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${!show ? 'lg:justify-center' : 'justify-start'}`}>
              {show ? 'Menu' : <DotsIcon />}
            </h2>
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const badgeCount = item.badge ? ordresCount : 0;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                        ${!show ? 'lg:justify-center' : ''}
                        ${isActive(item.path)
                          ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                    >
                      <span className={`relative shrink-0 ${isActive(item.path) ? 'text-brand-500' : 'text-gray-500 group-hover:text-gray-700'}`}>
                        {item.icon}
                        {badgeCount > 0 && !show && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {badgeCount > 9 ? '9+' : badgeCount}
                          </span>
                        )}
                      </span>
                      {show && <span className="flex-1">{item.name}</span>}
                      {show && badgeCount > 0 && (
                        <span className="ml-auto shrink-0 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
