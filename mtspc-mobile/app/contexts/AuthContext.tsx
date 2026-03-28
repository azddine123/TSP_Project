/**
 * AUTH CONTEXT MOBILE — SDK 54
 * ==============================
 * Gère le cycle de vie complet du JWT Keycloak sur mobile :
 * 1. Login via expo-auth-session (flux Authorization Code + PKCE)
 * 2. Stockage CHIFFRÉ du JWT via expo-secure-store
 * 3. Vérification d'expiration avant chaque appel API
 * 4. Logout : supprime tous les tokens du stockage sécurisé
 *
 * SDK 54 fix : parseJWTPayload() corrige le décodage base64url (RFC 4648 §5).
 * Le JWT utilise base64url (- et _ à la place de + et /) sans padding =.
 * atob() attend du base64 standard → conversion + padding explicite requis.
 */
import React, {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthUser } from '../types/app';

const TOKEN_KEY         = 'reliefchain_access_token';
const REFRESH_TOKEN_KEY = 'reliefchain_refresh_token';
const USER_KEY          = 'reliefchain_user';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading:       boolean;
  user:            AuthUser | null;
  accessToken:     string | null;
  saveSession:     (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout:          () => Promise<void>;
  getValidToken:   () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Utilitaire JWT ────────────────────────────────────────────────────────────

/**
 * Décode le payload d'un JWT en gérant le base64url (RFC 4648 §5).
 * Le base64url remplace + par - et / par _ et omet le padding =.
 * atob() ne comprend que le base64 standard → conversion + padding requis.
 *
 * Sans ce fix, atob() lève "Invalid character" sur les tokens Keycloak
 * contenant des caractères - ou _ dans le payload (fréquent sur RN 0.74+).
 */
function parseJWTPayload(token: string): Record<string, any> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + (4 - (base64.length % 4)) % 4,
    '=',
  );
  return JSON.parse(atob(padded));
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);
  const [user,            setUser]            = useState<AuthUser | null>(null);
  const [accessToken,     setAccessToken]     = useState<string | null>(null);

  const logout = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Restaurer la session depuis le stockage sécurisé au démarrage de l'app
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (token && storedUser) {
          const payload   = parseJWTPayload(token);
          const isExpired = payload.exp * 1000 < Date.now();

          if (!isExpired) {
            setAccessToken(token);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } else {
            // Token expiré → forcer la reconnexion
            await logout();
          }
        }
      } catch (err) {
        console.warn('[Auth] Erreur restauration session :', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [logout]);

  /**
   * saveSession() — Appelée après un login Keycloak réussi.
   * Stocke le JWT de façon CHIFFRÉE via expo-secure-store.
   * Android : AES via Android Keystore.
   * iOS     : Secure Enclave / Keychain.
   */
  const saveSession = useCallback(
    async (token: string, refreshToken: string, authUser: AuthUser) => {
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY,         token),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
        SecureStore.setItemAsync(USER_KEY,          JSON.stringify(authUser)),
      ]);
      setAccessToken(token);
      setUser(authUser);
      setIsAuthenticated(true);
    },
    [],
  );

  /**
   * getValidToken() — Retourne le token courant (ou null si expiré).
   * Utilisé par les services API pour injecter le Bearer.
   * Buffer de 30 s pour éviter les races entre vérification et requête.
   */
  const getValidToken = useCallback(async (): Promise<string | null> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload   = parseJWTPayload(token);
      const expiresIn = payload.exp * 1000 - Date.now();
      if (expiresIn > 30_000) return token;
      await logout();
      return null;
    } catch {
      return null;
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isLoading, user, accessToken,
      saveSession, logout, getValidToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être dans <AuthProvider>');
  return ctx;
}
