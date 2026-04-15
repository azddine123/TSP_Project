/**
 * CONFIGURATION KEYCLOAK MOBILE — SDK 54 compatible
 * ===================================================
 * SDK 54 breaking change : Constants.manifest supprimé (expo-constants ~17).
 * Utiliser Constants.expoConfig à la place.
 *
 * Détection automatique de l'IP :
 *   - Variable d'env EXPO_PUBLIC_API_HOST prioritaire (prod / CI / jury)
 *   - Émulateur Android → 10.0.2.2 (passerelle vers l'hôte)
 *   - Simulateur iOS    → localhost
 *   - Appareil réel     → IP fallback manuelle (ou via .env)
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHostUri = (): string => {
  // 1. Variable d'environnement prioritaire (prod / CI / jury avec .env)
  const envHost = process.env.EXPO_PUBLIC_API_HOST ||
    (Constants.expoConfig?.extra?.apiHost as string | undefined);
  if (envHost) return envHost;

  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Émulateur Android → passerelle vers la machine hôte
      if (!Constants.isDevice) return '10.0.2.2';
      // Appareil réel Android → utiliser l'IP Wi-Fi du PC (configurer dans .env)
      return '192.168.1.6';
    }

    if (Platform.OS === 'ios') {
      // Simulateur iOS → localhost
      if (!Constants.isDevice) return 'localhost';
      // Appareil réel iOS → utiliser l'IP Wi-Fi du PC (configurer dans .env)
      return '192.168.1.6';
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
