import { jsx as _jsx } from "react/jsx-runtime";
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
import { createContext, useContext, useEffect, useState, } from 'react';
import keycloak from '../keycloak';
// ── Contexte ─────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
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
                const parsed = keycloak.tokenParsed;
                // Normaliser les rôles : claim plat "roles" ou realm_access.roles
                const roles = [
                    ...(parsed.roles || []),
                    ...(parsed.realm_access?.roles || []),
                ].filter((r) => ['SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR'].includes(r));
                setUser({
                    userId: parsed.sub,
                    username: parsed.preferred_username,
                    email: parsed.email || '',
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
    const hasRole = (role) => user?.roles.includes(role) ?? false;
    const logout = () => keycloak.logout({ redirectUri: window.location.origin });
    return (_jsx(AuthContext.Provider, { value: {
            isAuthenticated,
            isLoading,
            user,
            token: keycloak.token,
            hasRole,
            logout,
        }, children: children }));
}
// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth doit être utilisé dans <AuthProvider>');
    return ctx;
}
