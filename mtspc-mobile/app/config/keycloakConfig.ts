/**
 * CONFIGURATION KEYCLOAK MOBILE
 * ===============================
 * Adapté de labcollect-mobile/app/config/keycloakConfig.ts
 *
 * Point clé pour la démo jury : getHostUri() détecte automatiquement
 * l'adresse IP locale selon la plateforme (émulateur Android = 10.0.2.2,
 * appareil réel Expo Go = IP extraite du debuggerHost).
 * Cela évite de coder l'IP en dur et de se retrouver bloqué en présentation.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostUri = (): string => {
  // 1. Variable d'environnement prioritaire (prod / CI)
  const envHost = process.env.EXPO_PUBLIC_API_HOST || Constants.expoConfig?.extra?.apiHost;
  if (envHost) return envHost;

  if (__DEV__) {
    const isExpoGo     = Constants.appOwnership === 'expo';
    const debuggerHost = (Constants.manifest as any)?.debuggerHost;

    // Expo Go sur appareil réel → extraire l'IP du debuggerHost (ex: "192.168.1.5:8081")
    if (isExpoGo && debuggerHost) {
      return debuggerHost.split(':')[0];
    }

    if (Platform.OS === 'android') {
      // Émulateur Android → passerelle vers la machine hôte
      if (!Constants.isDevice) return '10.0.2.2';
      // Appareil réel Android → fallback IP manuelle
      return '192.168.1.1';
    }

    if (Platform.OS === 'ios') {
      // Simulateur iOS → localhost
      if (!Constants.isDevice) return 'localhost';
      return '192.168.1.1';
    }
  }

  return 'localhost';
};

const HOST = getHostUri();

const isLocal = __DEV__ ||
  HOST.startsWith('192.168.') ||
  HOST.startsWith('10.0.') ||
  HOST === 'localhost';

// ── URLs exportées ────────────────────────────────────────────────────────────

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ||
  (isLocal ? `http://${HOST}:9090/api/v1` : 'https://api.logistique.gov.ma/v1');

export const KEYCLOAK_SERVER = process.env.EXPO_PUBLIC_KEYCLOAK_SERVER ||
  (isLocal ? `http://${HOST}:8180` : 'https://auth.logistique.gov.ma');

export const KEYCLOAK_REALM     = 'Logistique';
export const KEYCLOAK_CLIENT_ID = 'logistique-mobile';

// Scheme déclaré dans app.json → Keycloak redirige ici après login
export const REDIRECT_URI = 'logistique://callback';

if (__DEV__) {
  console.log('[Config] Host détecté :', HOST);
  console.log('[Config] API :', API_BASE_URL);
  console.log('[Config] Keycloak :', KEYCLOAK_SERVER);
}
