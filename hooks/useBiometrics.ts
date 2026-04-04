/**
 * useBiometrics — Hook d'authentification biométrique
 * =====================================================
 * Encapsule expo-local-authentication pour :
 * - Vérifier la compatibilité matérielle (capteur + empreintes enregistrées)
 * - Déclencher le prompt biométrique natif (Empreinte / FaceID)
 * - Exposer le type de biométrie disponible pour l'UI
 *
 * La biométrie sert UNIQUEMENT de "gate" local pour accéder aux tokens
 * déjà stockés dans SecureStore — aucun appel réseau requis.
 */
import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'fingerprint' | 'faceid' | 'iris' | 'none';

export interface BiometricsState {
  /** Le matériel biométrique est présent ET des empreintes sont enregistrées */
  isAvailable: boolean;
  /** Type de biométrie principal disponible (pour l'icône/label UI) */
  biometricType: BiometricType;
  /** true pendant la vérification initiale de disponibilité */
  isChecking: boolean;
}

export interface BiometricsActions {
  /** Déclenche le prompt biométrique natif. Retourne true si succès. */
  authenticate: (reason?: string) => Promise<boolean>;
  /** Recharge l'état de disponibilité (utile après un changement dans les réglages) */
  recheck: () => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapBiometricType(
  types: LocalAuthentication.AuthenticationType[],
): BiometricType {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'faceid';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return 'none';
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBiometrics(): BiometricsState & BiometricsActions {
  const [isAvailable,   setIsAvailable]   = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isChecking,    setIsChecking]    = useState(true);

  const checkAvailability = useCallback(async () => {
    setIsChecking(true);
    try {
      // 1. Le hardware biométrique est-il présent ?
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setIsAvailable(false);
        setBiometricType('none');
        return;
      }

      // 2. L'utilisateur a-t-il enregistré au moins une empreinte / un visage ?
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        setIsAvailable(false);
        setBiometricType('none');
        return;
      }

      // 3. Quel type de biométrie est disponible ?
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setIsAvailable(true);
      setBiometricType(mapBiometricType(types));
    } catch (err) {
      console.warn('[useBiometrics] Erreur vérification :', err);
      setIsAvailable(false);
      setBiometricType('none');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  /**
   * authenticate() — Affiche le prompt biométrique natif.
   *
   * Cas gérés :
   *  - Succès → true
   *  - Annulation utilisateur (UserCancel) → false (silencieux)
   *  - Trop d'essais / lockout → false (silencieux, l'OS gère le message)
   *  - Erreur système → false
   */
  const authenticate = useCallback(async (
    reason = 'Confirmez votre identité pour accéder à ReliefChain',
  ): Promise<boolean> => {
    if (!isAvailable) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:        reason,
        cancelLabel:          'Utiliser le mot de passe',
        fallbackLabel:        'Mot de passe',
        // Sur iOS, propose le fallback PIN/password si biométrie échoue
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (err) {
      // Ne jamais exposer une erreur système comme un succès
      console.warn('[useBiometrics] Erreur authentification :', err);
      return false;
    }
  }, [isAvailable]);

  return {
    isAvailable,
    biometricType,
    isChecking,
    authenticate,
    recheck: checkAvailability,
  };
}
