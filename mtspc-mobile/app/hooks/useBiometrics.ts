/**
 * HOOK useBiometrics — Détection et authentification biométrique
 * ================================================================
 * Wrapper autour de expo-local-authentication pour la détection
 * du type de biométrie disponible (Face ID, empreinte, etc.)
 */
import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

interface UseBiometricsReturn {
  /** La biométrie est-elle disponible sur cet appareil ? */
  isAvailable: boolean;
  /** Type de biométrie détecté : 'fingerprint' | 'faceid' | 'iris' | 'none' */
  biometricType: 'fingerprint' | 'faceid' | 'iris' | 'none';
  /** Vérification en cours */
  isChecking: boolean;
  /** Déclencher l'authentification biométrique */
  authenticate: (promptMessage?: string) => Promise<boolean>;
}

export function useBiometrics(): UseBiometricsReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'faceid' | 'iris' | 'none'>('none');
  const [isChecking, setIsChecking] = useState(true);

  // Détection initiale des capacités biométriques
  useEffect(() => {
    async function checkBiometrics() {
      try {
        // Désactiver sur le web
        if (Platform.OS === 'web') {
          setIsAvailable(false);
          setBiometricType('none');
          setIsChecking(false);
          return;
        }

        // Vérifier le hardware
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        const available = hasHardware && isEnrolled;
        setIsAvailable(available);

        if (available) {
          // Détecter le type de biométrie
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('faceid');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType('iris');
          } else {
            setBiometricType('none');
          }
        } else {
          setBiometricType('none');
        }
      } catch (error) {
        console.error('[useBiometrics] Erreur détection:', error);
        setIsAvailable(false);
        setBiometricType('none');
      } finally {
        setIsChecking(false);
      }
    }

    checkBiometrics();
  }, []);

  // Fonction d'authentification
  const authenticate = useCallback(async (promptMessage?: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authentifiez-vous pour continuer',
        fallbackLabel: 'Utiliser le mot de passe',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('[useBiometrics] Erreur authentification:', error);
      return false;
    }
  }, []);

  return {
    isAvailable,
    biometricType,
    isChecking,
    authenticate,
  };
}

export default useBiometrics;
