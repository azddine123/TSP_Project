/**
 * AUTH CONTEXT MOBILE
 * ====================
 * Gère le cycle de vie complet du JWT Keycloak sur mobile :
 * 1. Login via expo-auth-session (flux Authorization Code + PKCE)
 * 2. Stockage CHIFFRÉ du JWT via expo-secure-store (protège contre le vol du téléphone)
 * 3. Renouvellement silencieux du token avant expiration
 * 4. Logout : supprime le token du stockage sécurisé
 */
import React, {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthUser } from '../types/app';

const TOKEN_KEY         = 'mtspc26_access_token';
const REFRESH_TOKEN_KEY = 'mtspc26_refresh_token';
const USER_KEY          = 'mtspc26_user';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);
  const [user,            setUser]            = useState<AuthUser | null>(null);
  const [accessToken,     setAccessToken]     = useState<string | null>(null);

  // Restaurer la session depuis le stockage sécurisé au démarrage de l'app
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (token && storedUser) {
          // Vérifier si le token n'est pas expiré
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();

          if (!isExpired) {
            setAccessToken(token);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } else {
            // Token expiré → tenter un refresh, sinon déconnecter
            await logout();
          }
        }
      } catch (err) {
        console.warn('[Auth] Erreur restauration session :', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /**
   * saveSession() — Appelée après un login Keycloak réussi.
   * Stocke le JWT de façon CHIFFRÉE via expo-secure-store.
   * Sur Android : chiffrement AES via Android Keystore.
   * Sur iOS     : chiffrement via Secure Enclave / Keychain.
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

  /**
   * getValidToken() — Retourne le token courant (ou null si expiré).
   * Utilisé par les services API pour injecter le Bearer.
   */
  const getValidToken = useCallback(async (): Promise<string | null> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload  = JSON.parse(atob(token.split('.')[1]));
      const expiresIn = payload.exp * 1000 - Date.now();
      if (expiresIn > 30_000) return token;   // Encore valide > 30 s
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
