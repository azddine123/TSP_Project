/**
 * PAGE DE LOGIN — Formulaire username / password (Tailwind)
 */
import React, { useState } from 'react';
import { useAuth }     from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login }                = useAuth();
  const navigate                 = useNavigate();
  const [username, setUsername]  = useState('');
  const [password, setPassword]  = useState('');
  const [showPass, setShowPass]  = useState(false);
  const [loading,  setLoading]   = useState(false);
  const [error,    setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Veuillez saisir votre identifiant et mot de passe.');
      return;
    }
    setLoading(true);
    setError(null);
    const err = await login(username.trim(), password);
    if (err) { setError(err); setLoading(false); }
    else navigate('/');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0A3D62 50%, #0D1B2A 100%)' }}
    >
      <div className="w-full max-w-[420px]">

        {/* En-tête avec Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div
              className="w-28 h-28 rounded-full overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                boxShadow: '0 8px 32px rgba(21,101,192,0.5), 0 0 0 4px rgba(255,255,255,0.1)'
              }}
            >
              <img
                src="/NAJDA_Logo.png"
                alt="NAJDA Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">NAJDA</h1>
          <p className="text-sm text-white/55 mt-1">
            Plateforme de distribution humanitaire . Béni Mellal-Khénifra
          </p>
        </div>

        {/* Carte formulaire */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h2 className="text-lg font-bold text-white mb-1">Connexion</h2>
          <p className="text-sm text-white/45 mb-6">Accès réservé au personnel autorisé</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-900/40 border border-red-500/40 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
              <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Identifiant */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Identifiant"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/35 bg-white/[0.07] border border-white/15 outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Mot de passe */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-white/35 bg-white/[0.07] border border-white/15 outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                tabIndex={-1}
                aria-label={showPass ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-3 rounded-xl text-sm font-bold text-white tracking-wide transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(90deg, #1565C0 0%, #0D47A1 100%)',
                boxShadow: '0 4px 20px rgba(21,101,192,0.4)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours…
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/25 mt-6">
          🔒 Authentification sécurisée · Keycloak SSO
        </p>
      </div>
    </div>
  );
}
