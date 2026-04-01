/**
 * PROTECTED ROUTE — Garde d'accès par rôle (côté React)
 * ======================================================
 * Logique d'authentification/rôles inchangée.
 * UI migrée de MUI vers Tailwind CSS.
 */
import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  allowedRoles: string[];
  children: ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, hasRole, logout } = useAuth();

  const isAllowed = allowedRoles.some((role) => hasRole(role));

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-center px-4">
        <svg className="w-16 h-16 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Accès Refusé</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Votre rôle <strong className="text-gray-700 dark:text-gray-200">{user?.roles[0] || 'inconnu'}</strong> ne
          permet pas d'accéder à cet espace.
          <br />
          Rôle(s) requis : <strong className="text-gray-700 dark:text-gray-200">{allowedRoles.join(', ')}</strong>
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
