/**
 * AUTH CONTEXT MOBILE — SDK 54
 * ==============================
 * Gère le cycle de vie complet du JWT Keycloak sur mobile :
 * 1. Login via formulaire username/password → endpoint token Keycloak
 * 2. Stockage CHIFFRÉ du JWT via expo-secure-store
 * 3. Vérification d'expiration avant chaque appel API
 * 4. Authentification biométrique : la biométrie déverrouille l'accès
 *    aux tokens déjà stockés (aucun appel réseau requis — offline-first)
 * 5. Logout : supprime tous les tokens du stockage sécurisé
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

// ── Clés SecureStore ──────────────────────────────────────────────────────────

const TOKEN_KEY          = 'reliefchain_access_token';
const REFRESH_TOKEN_KEY  = 'reliefchain_refresh_token';
const USER_KEY           = 'reliefchain_user';
/**
 * Préférence biométrie stockée dans SecureStore (pas AsyncStorage)
 * pour éviter toute lecture non chiffrée sur Android sans PIN.
 */
const BIOMETRIC_PREF_KEY = 'reliefchain_biometric_enabled';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  isAuthenticated:      boolean;
  isLoading:            boolean;
  user:                 AuthUser | null;
  accessToken:          string | null;
  /** true si l'utilisateur a activé la biométrie dans ses préférences */
  isBiometricEnabled:   boolean;
  /**
   * true si une session valide existe dans SecureStore mais est en attente
   * de déverrouillage biométrique (l'app est en état "verrouillé").
   */
  isBiometricPending:   boolean;
  saveSession:          (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout:               () => Promise<void>;
  getValidToken:        () => Promise<string | null>;
  /** Active ou désactive la biométrie — appeler après un login réussi */
  setBiometricEnabled:  (enabled: boolean) => Promise<void>;
  /**
   * Déverrouille la session avec la biométrie.
   * À appeler depuis l'écran de login APRÈS que LocalAuthentication.authenticateAsync()
   * a retourné success=true. Relit les tokens depuis SecureStore pour être sûr.
   * Retourne false si la session est expirée ou absente.
   */
  unlockWithBiometrics: () => Promise<boolean>;
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
  const [isAuthenticated,    setIsAuthenticated]    = useState(false);
  const [isLoading,          setIsLoading]          = useState(true);
  const [user,               setUser]               = useState<AuthUser | null>(null);
  const [accessToken,        setAccessToken]        = useState<string | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  /**
   * isBiometricPending = une session valide existe dans SecureStore,
   * mais l'utilisateur doit confirmer sa biométrie pour y accéder.
   */
  const [isBiometricPending, setIsBiometricPending] = useState(false);

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      // On NE supprime PAS BIOMETRIC_PREF_KEY : l'utilisateur garde sa préférence
      // après un simple logout pour que la biométrie reste disponible à la
      // prochaine reconnexion manuelle.
    ]);
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsBiometricPending(false);
  }, []);

  // ── Restauration de session au démarrage ──────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser, biometricPref] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          SecureStore.getItemAsync(BIOMETRIC_PREF_KEY),
        ]);

        const biometricEnabled = biometricPref === 'true';
        setIsBiometricEnabled(biometricEnabled);

        if (storedUser) {
          // Vérifier la validité de l'access token
          let activeToken  = token;
          let tokenIsValid = false;

          if (activeToken) {
            const payload = parseJWTPayload(activeToken);
            tokenIsValid  = payload.exp * 1000 > Date.now();
          }

          // Si l'access token est expiré, tenter le rafraîchissement silencieux
          if (!tokenIsValid) {
            const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
            if (storedRefresh) {
              try {
                const { KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID } = await import('../config/keycloakConfig');
                const tokenUrl = `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
                const body = new URLSearchParams({
                  grant_type: 'refresh_token', client_id: KEYCLOAK_CLIENT_ID, refresh_token: storedRefresh,
                });
                const res = await fetch(tokenUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: body.toString(),
                });
                if (res.ok) {
                  const data = await res.json();
                  activeToken = data.access_token as string;
                  await Promise.all([
                    SecureStore.setItemAsync(TOKEN_KEY,         activeToken),
                    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token ?? storedRefresh),
                  ]);
                  tokenIsValid = true;
                }
              } catch {
                // Silencieux — on laisse continuer vers logout
              }
            }
          }

          if (!tokenIsValid || !activeToken) {
            // Refresh aussi échoué → déconnexion complète
            await logout();
            return;
          }

          if (biometricEnabled) {
            // Session valide + biométrie activée → état "verrouillé"
            // L'écran de login affichera le bouton biométrique.
            setIsBiometricPending(true);
          } else {
            // Biométrie désactivée → restauration automatique
            setAccessToken(activeToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.warn('[Auth] Erreur restauration session :', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [logout]);

  // ── Actions ───────────────────────────────────────────────────────────────

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
      setIsBiometricPending(false);
    },
    [],
  );

  /**
   * setBiometricEnabled() — Active/désactive la préférence biométrique.
   * À appeler depuis l'écran profil ou après un premier login réussi.
   */
  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, enabled ? 'true' : 'false');
    setIsBiometricEnabled(enabled);
  }, []);

  /**
   * unlockWithBiometrics() — Restaure la session après succès biométrique.
   *
   * Flux attendu :
   * 1. L'écran login appelle useBiometrics().authenticate() → true
   * 2. L'écran login appelle unlockWithBiometrics() ici
   * 3. On relit les tokens depuis SecureStore et on restaure l'état auth
   *
   * Sécurité : on ne fait jamais confiance à l'état mémoire.
   * On relit toujours depuis SecureStore pour garantir l'intégrité.
   */
  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      const [token, refreshToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (!storedUser) return false;

      // ── Cas 1 : access token encore valide ───────────────────────────────────
      if (token) {
        const payload   = parseJWTPayload(token);
        const isExpired = payload.exp * 1000 < Date.now();

        if (!isExpired) {
          setAccessToken(token);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
          setIsBiometricPending(false);
          return true;
        }
      }

      // ── Cas 2 : access token expiré → tenter un rafraîchissement ─────────────
      if (refreshToken) {
        try {
          const { KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID } = await import('../config/keycloakConfig');
          const tokenUrl = `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

          const body = new URLSearchParams({
            grant_type:    'refresh_token',
            client_id:     KEYCLOAK_CLIENT_ID,
            refresh_token: refreshToken,
          });

          const response = await fetch(tokenUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    body.toString(),
          });

          if (response.ok) {
            const data       = await response.json();
            const newToken   = data.access_token as string;
            const newRefresh = (data.refresh_token as string) ?? refreshToken;

            // Persister les nouveaux tokens
            await Promise.all([
              SecureStore.setItemAsync(TOKEN_KEY,         newToken),
              SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh),
            ]);

            setAccessToken(newToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
            setIsBiometricPending(false);
            return true;
          }
        } catch (refreshErr) {
          console.warn('[Auth] Rafraîchissement du token échoué :', refreshErr);
        }
      }

      // ── Cas 3 : impossible de renouveler → déconnexion ───────────────────────
      await logout();
      return false;
    } catch (err) {
      console.warn('[Auth] Erreur déverrouillage biométrique :', err);
      return false;
    }
  }, [logout]);

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
      isAuthenticated,
      isLoading,
      user,
      accessToken,
      isBiometricEnabled,
      isBiometricPending,
      saveSession,
      logout,
      getValidToken,
      setBiometricEnabled,
      unlockWithBiometrics,
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
