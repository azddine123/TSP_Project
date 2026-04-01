/**
 * PAGE DISTRIBUTEUR — Accès Web refusé (Tailwind CSS)
 * Logique identique : même contenu, même comportement.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DistributeurPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)' }}
    >
      <div className="w-full max-w-[520px] bg-white rounded-3xl overflow-hidden shadow-2xl text-center">

        {/* Bandeau rouge en haut */}
        <div className="bg-red-600 py-3">
          <span className="text-white text-xs font-bold tracking-[3px] uppercase">Accès Refusé</span>
        </div>

        <div className="px-8 py-10">
          {/* Icône smartphone */}
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-12 h-12 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">Espace Réservé — Application Mobile</h1>

          {user && (
            <p className="text-sm text-gray-500 mb-4">
              Connecté en tant que <strong className="text-gray-700">{user.username}</strong> · Rôle : <strong className="text-gray-700">DISTRIBUTEUR</strong>
            </p>
          )}

          <p className="text-gray-600 leading-relaxed mb-6">
            En tant que <strong>Distributeur</strong>, vous n'avez pas accès
            au portail Web de gestion logistique.
            <br /><br />
            Veuillez utiliser l'<strong>Application Mobile dédiée</strong> installée
            sur votre téléphone pour consulter et valider vos missions de livraison.
          </p>

          {/* Indicateur visuel mobile */}
          <div className="flex items-center justify-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-6">
            <svg className="w-5 h-5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-bold text-blue-800">
              Ouvrez l'app Logistique ReliefChain sur votre téléphone
            </span>
          </div>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full py-3 text-sm font-semibold text-red-600 border-2 border-red-300 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
