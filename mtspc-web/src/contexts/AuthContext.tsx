/**
 * AUTH CONTEXT — Authentification directe Keycloak (sans redirection)
 * ====================================================================
 * Appel direct à l'endpoint token Keycloak (grant_type=password).
 * Le JWT est stocké dans localStorage pour persister la session.
 */
import React, {
  createContext, useContext, useEffect, useState, ReactNode,
} from 'react';

const KEYCLOAK_URL    = import.meta.env.VITE_KEYCLOAK_URL   || 'http://localhost:8180';
const KEYCLOAK_REALM  = import.meta.env.VITE_KEYCLOAK_REALM || 'Logistique';
const CLIENT_ID       = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'logistique-web';
const TOKEN_KEY       = 'reliefchain_token';
const USER_KEY        = 'reliefchain_user';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  token:           string | null;
  login:           (username: string, password: string) => Promise<string | null>;
  logout:          () => void;
  hasRole:         (role: string) => boolean;
}

// ── Utilitaire JWT ─────────────────────────────────────────────────────────────

function parseJWT(token: string): Record<string, any> {
  const base64Url = token.split('.')[1];
  const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded    = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return JSON.parse(atob(padded));
}

function isTokenExpired(token: string): boolean {
  try {
    const { exp } = parseJWT(token);
    return exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// ── Contexte ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);
  const [user,            setUser]            = useState<AuthUser | null>(null);
  const [token,           setToken]           = useState<string | null>(null);

  // Restaurer la session depuis localStorage au démarrage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser  = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser && !isTokenExpired(storedToken)) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setIsLoading(false);
  }, []);

  // Fonction de login — appelle directement l'endpoint token Keycloak
  const login = async (username: string, password: string): Promise<string | null> => {
    const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id:  CLIENT_ID,
      username,
      password,
      scope:      'openid profile email',
    });

    const response = await fetch(tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return data.error_description || data.error || 'Identifiants incorrects.';
    }

    const payload = parseJWT(data.access_token);
    const roles: string[] = [
      ...(payload.roles               || []),
      ...(payload.realm_access?.roles || []),
    ].filter((r: string) =>
      ['SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR'].includes(r),
    );

    const authUser: AuthUser = {
      userId:   payload.sub,
      username: payload.preferred_username,
      email:    payload.email || '',
      roles,
    };

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY,  JSON.stringify(authUser));

    setToken(data.access_token);
    setUser(authUser);
    setIsAuthenticated(true);
    return null; // null = succès
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasRole = (role: string) => user?.roles.includes(role) ?? false;

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isLoading, user, token,
      login, logout, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
