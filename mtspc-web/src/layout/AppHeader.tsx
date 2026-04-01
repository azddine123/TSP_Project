import { useState, useRef, useEffect } from 'react';
import { useSidebar } from './SidebarContext';
import { useAuth } from '../contexts/AuthContext';

// ── Icônes SVG inline ────────────────────────────────────────────────────────

const MenuIcon = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M0.583 1C0.583 0.586 0.919 0.25 1.333 0.25H14.667C15.081 0.25 15.417 0.586 15.417 1C15.417 1.414 15.081 1.75 14.667 1.75L1.333 1.75C0.919 1.75 0.583 1.414 0.583 1ZM0.583 11C0.583 10.586 0.919 10.25 1.333 10.25L14.667 10.25C15.081 10.25 15.417 10.586 15.417 11C15.417 11.414 15.081 11.75 14.667 11.75L1.333 11.75C0.919 11.75 0.583 11.414 0.583 11ZM1.333 5.25C0.919 5.25 0.583 5.586 0.583 6C0.583 6.414 0.919 6.75 1.333 6.75L8 6.75C8.414 6.75 8.75 6.414 8.75 6C8.75 5.586 8.414 5.25 8 5.25L1.333 5.25Z"
      fill="currentColor" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M6.22 7.28a.75.75 0 011.06 0L12 11.94l4.72-4.66a.75.75 0 011.06 1.06L13.06 12l4.72 4.72a.75.75 0 01-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 01-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 010-1z"
      fill="currentColor" />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// ── Composant ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_ENTREPOT: 'Admin Entrepôt',
  DISTRIBUTEUR: 'Distributeur',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  ADMIN_ENTREPOT: 'bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-300',
  DISTRIBUTEUR: 'bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300',
};

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (window.innerWidth >= 991) toggleSidebar();
    else toggleMobileSidebar();
  };

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rôle principal de l'utilisateur
  const mainRole = user?.roles.find((r) => ['SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR'].includes(r));
  const roleLabel = mainRole ? ROLE_LABELS[mainRole] : '';
  const roleColor = mainRole ? ROLE_COLORS[mainRole] : 'bg-gray-100 text-gray-600';

  return (
    <header className="sticky top-0 flex w-full bg-white border-b border-gray-200 z-[99999] dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between flex-grow px-4 py-3 lg:px-6">
        {/* Gauche : bouton toggle sidebar */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className="flex items-center justify-center w-10 h-10 text-gray-500 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          {/* Nom de l'app — visible uniquement sur mobile (la sidebar le cache sur desktop) */}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 lg:hidden">
            ReliefChain
          </span>
        </div>

        {/* Droite : badge rôle + menu utilisateur */}
        <div className="flex items-center gap-3">
          {/* Badge rôle */}
          {roleLabel && (
            <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleColor}`}>
              {roleLabel}
            </span>
          )}

          {/* Dropdown utilisateur */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                <UserIcon />
              </span>
              <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.username || 'Utilisateur'}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
              </svg>
            </button>

            {/* Menu déroulant */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-theme-lg border border-gray-100 dark:border-gray-800 py-1 z-[999]">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-950 transition-colors"
                >
                  <LogoutIcon />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
