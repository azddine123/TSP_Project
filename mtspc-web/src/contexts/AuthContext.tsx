/**
 * AUTH CONTEXT — État d'authentification global
 * ==============================================
 *
 * Initialise Keycloak au démarrage, expose dans toute l'app :
 * - isAuthenticated : l'utilisateur est-il connecté ?
 * - user            : profil (username, email, roles)
 * - token           : JWT brut à envoyer dans les headers API
 * - logout()        : déconnecter l'utilisateur
 * - hasRole()       : vérifier un rôle RBAC
 */
import React, {
  createContext, useContext, useEffect, useState, ReactNode,
} from 'react';
import keycloak from '../keycloak';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  userId:   string;
  username: string;
  email:    string;
  roles:    string[];
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading:       boolean;
  user:            AuthUser | null;
  token:           string | undefined;
  hasRole:         (role: string) => boolean;
  logout:          () => void;
}

// ── Contexte ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);
  const [user,            setUser]            = useState<AuthUser | null>(null);

  useEffect(() => {
    /**
     * keycloak.init() avec onLoad: 'login-required' :
     * Si l'utilisateur n'est PAS connecté → redirige automatiquement
     * vers la page de login Keycloak. L'application React ne s'affiche
     * jamais sans authentification valide.
     */
    keycloak
      .init({ onLoad: 'login-required', checkLoginIframe: false })
      .then((authenticated) => {
        if (authenticated && keycloak.tokenParsed) {
          const parsed = keycloak.tokenParsed as any;

          // Normaliser les rôles : claim plat "roles" ou realm_access.roles
          const roles: string[] = [
            ...(parsed.roles || []),
            ...(parsed.realm_access?.roles || []),
          ].filter((r: string) =>
            ['SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR'].includes(r),
          );

          setUser({
            userId:   parsed.sub,
            username: parsed.preferred_username,
            email:    parsed.email || '',
            roles,
          });
          setIsAuthenticated(true);
        }
      })
      .catch((err) => {
        console.error('[Keycloak] Erreur d\'initialisation :', err);
      })
      .finally(() => setIsLoading(false));

    // Renouveler le token automatiquement 60 s avant expiration
    keycloak.onTokenExpired = () => {
      keycloak
        .updateToken(60)
        .catch(() => keycloak.logout());
    };
  }, []);

  const hasRole = (role: string) => user?.roles.includes(role) ?? false;

  const logout = () =>
    keycloak.logout({ redirectUri: window.location.origin });

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token: keycloak.token,
        hasRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
