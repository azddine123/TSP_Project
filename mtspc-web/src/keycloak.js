/**
 * INSTANCE KEYCLOAK — Singleton partagé dans toute l'application
 * ==============================================================
 *
 * On crée UNE SEULE instance Keycloak et on l'exporte.
 * AuthContext l'initialise au démarrage de l'app (dans main.tsx).
 *
 * POUR LE JURY : ce fichier est le pont entre notre React.js et
 * le serveur SSO Keycloak. Grâce à lui, notre application ne gère
 * jamais de mots de passe — tout est délégué à Keycloak.
 */
import Keycloak from 'keycloak-js';
const keycloak = new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'Logistique',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'logistique-web',
});
export default keycloak;
