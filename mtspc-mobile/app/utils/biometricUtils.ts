import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';
import { secureStore } from './secureStoreWeb';

// Types pour l'authentification biométrique
export interface BiometricConfig {
  promptMessage: string;
  fallbackLabel: string;
  cancelLabel: string;
  disableDeviceFallback: boolean;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
  type?: 'fingerprint' | 'face' | 'iris';
}

// Configuration par défaut
const DEFAULT_CONFIG: BiometricConfig = {
  promptMessage: 'Authentifiez-vous pour accéder à l\'application',
  fallbackLabel: 'Utiliser le mot de passe',
  cancelLabel: 'Annuler',
  disableDeviceFallback: false,
};

/**
 * Vérifier si l'authentification biométrique est disponible
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    // Désactiver l'authentification biométrique sur le web
    if (Platform.OS === 'web') {
      console.log('🌐 Authentification biométrique désactivée sur le web');
      return false;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    return hasHardware && isEnrolled;
  } catch (error: any) {
    console.error('Erreur lors de la vérification biométrique:', error);
    return false;
  }
};

/**
 * Obtenir les types d'authentification disponibles
 */
export const getAvailableBiometricTypes = async (): Promise<LocalAuthentication.AuthenticationType[]> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types;
  } catch (error: any) {
    console.error('Erreur lors de la récupération des types biométriques:', error);
    return [];
  }
};

/**
 * Obtenir le nom lisible du type d'authentification
 */
export const getBiometricTypeName = (type: LocalAuthentication.AuthenticationType): string => {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'Empreinte digitale';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'Reconnaissance faciale';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'Reconnaissance de l\'iris';
    default:
      return 'Authentification biométrique';
  }
};

/**
 * Authentifier avec la biométrie
 */
export const authenticateWithBiometrics = async (
  config: Partial<BiometricConfig> = {}
): Promise<BiometricResult> => {
  try {
    // Désactiver l'authentification biométrique sur le web
    if (Platform.OS === 'web') {
      console.log('🌐 Authentification biométrique non supportée sur le web');
      return {
        success: false,
        error: 'Authentification biométrique non supportée sur le web',
      };
    }

    // Vérifier si la biométrie est disponible
    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Authentification biométrique non disponible sur cet appareil',
      };
    }

    // Fusionner avec la configuration par défaut
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Effectuer l'authentification
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: finalConfig.promptMessage,
      fallbackLabel: finalConfig.fallbackLabel,
      cancelLabel: finalConfig.cancelLabel,
      disableDeviceFallback: finalConfig.disableDeviceFallback,
    });

    if (result.success) {
      console.log('✅ Authentification biométrique réussie');
      return {
        success: true,
        type: getBiometricTypeFromResult(result),
      };
    } else {
      console.log('❌ Authentification biométrique échouée:', result.error);
      return {
        success: false,
        error: getErrorMessage(result.error),
      };
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'authentification biométrique:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'authentification biométrique',
    };
  }
};

/**
 * Obtenir le type d'authentification à partir du résultat
 */
const getBiometricTypeFromResult = (result: LocalAuthentication.LocalAuthenticationResult): 'fingerprint' | 'face' | 'iris' => {
  // Cette fonction détermine le type d'authentification utilisé
  // En fonction du résultat de l'authentification
  // Note: LocalAuthenticationResult n'a pas de propriété authenticationType
  // On retourne le type par défaut
  return 'fingerprint'; // Par défaut
};

/**
 * Obtenir un message d'erreur lisible
 */
const getErrorMessage = (error: string): string => {
  switch (error) {
    case 'UserCancel':
      return 'Authentification annulée par l\'utilisateur';
    case 'UserFallback':
      return 'L\'utilisateur a choisi l\'option de secours';
    case 'SystemCancel':
      return 'Authentification annulée par le système';
    case 'AuthenticationFailed':
      return 'Échec de l\'authentification';
    case 'PasscodeNotSet':
      return 'Aucun code de verrouillage configuré';
    case 'FingerprintScannerNotAvailable':
      return 'Scanner d\'empreinte non disponible';
    case 'FingerprintScannerNotEnrolled':
      return 'Aucune empreinte enregistrée';
    case 'FingerprintScannerLockout':
      return 'Scanner d\'empreinte verrouillé';
    case 'FingerprintScannerLockoutPermanent':
      return 'Scanner d\'empreinte verrouillé définitivement';
    default:
      return 'Erreur d\'authentification inconnue';
  }
};

/**
 * Configurer l'authentification biométrique
 */
export const setupBiometricAuth = async (): Promise<boolean> => {
  try {
    // Désactiver l'authentification biométrique sur le web
    if (Platform.OS === 'web') {
      console.log('🌐 Configuration biométrique non supportée sur le web');
      return false;
    }

    // Vérifier si la biométrie est disponible
    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) {
      Alert.alert(
        'Biométrie non disponible',
        'Votre appareil ne supporte pas l\'authentification biométrique ou aucune empreinte n\'est configurée.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Tester l'authentification
    const result = await authenticateWithBiometrics({
      promptMessage: 'Configurez l\'authentification biométrique en vous authentifiant maintenant',
      fallbackLabel: 'Configurer plus tard',
    });

    if (result.success) {
      // Sauvegarder la configuration
      await secureStore.setItemAsync('biometric_enabled', 'true');
      Alert.alert(
        'Configuration réussie',
        'L\'authentification biométrique a été activée avec succès.',
        [{ text: 'OK' }]
      );
      return true;
    } else {
      Alert.alert(
        'Configuration échouée',
        result.error || 'Impossible de configurer l\'authentification biométrique.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error: any) {
    console.error('Erreur lors de la configuration biométrique:', error);
    Alert.alert(
      'Erreur',
      'Une erreur est survenue lors de la configuration de l\'authentification biométrique.',
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Vérifier si l'authentification biométrique est activée
 */
export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await secureStore.getItemAsync('biometric_enabled');
    return enabled === 'true';
  } catch (error: any) {
    console.error('Erreur lors de la vérification de l\'activation biométrique:', error);
    return false;
  }
};

/**
 * Désactiver l'authentification biométrique
 */
export const disableBiometricAuth = async (): Promise<void> => {
  try {
    await secureStore.deleteItemAsync('biometric_enabled');
    console.log('🔒 Authentification biométrique désactivée');
  } catch (error: any) {
    console.error('Erreur lors de la désactivation biométrique:', error);
  }
};

/**
 * Authentification automatique avec biométrie
 */
export const autoAuthenticateWithBiometrics = async (): Promise<BiometricResult> => {
  try {
    // Vérifier si l'authentification biométrique est activée
    const isEnabled = await isBiometricEnabled();
    if (!isEnabled) {
      return {
        success: false,
        error: 'Authentification biométrique non activée',
      };
    }

    // Effectuer l'authentification automatique
    return await authenticateWithBiometrics({
      promptMessage: 'Authentifiez-vous pour accéder à l\'application',
      fallbackLabel: 'Utiliser le mot de passe',
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'authentification automatique:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'authentification automatique',
    };
  }
};

/**
 * Sauvegarder les identifiants de manière sécurisée pour l'authentification biométrique
 */
export const saveCredentialsForBiometric = async (username: string, password: string): Promise<void> => {
  try {
    // Sauvegarder les identifiants de manière sécurisée
    await secureStore.setItemAsync('biometric_username', username);
    await secureStore.setItemAsync('biometric_password', password);
    console.log('✅ Identifiants sauvegardés pour l\'authentification biométrique');
  } catch (error: any) {
    console.error('❌ Erreur lors de la sauvegarde des identifiants:', error);
    throw error;
  }
};

/**
 * Récupérer les identifiants sauvegardés pour l'authentification biométrique
 */
export const getCredentialsForBiometric = async (): Promise<{ username: string; password: string } | null> => {
  try {
    const username = await secureStore.getItemAsync('biometric_username');
    const password = await secureStore.getItemAsync('biometric_password');
    
    if (username && password) {
      return { username, password };
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des identifiants:', error);
    return null;
  }
};

/**
 * Supprimer les identifiants sauvegardés
 */
export const clearBiometricCredentials = async (): Promise<void> => {
  try {
    await secureStore.deleteItemAsync('biometric_username');
    await secureStore.deleteItemAsync('biometric_password');
    console.log('✅ Identifiants biométriques supprimés');
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression des identifiants:', error);
  }
};

/**
 * Authentification biométrique complète avec récupération des identifiants
 */
export const authenticateWithBiometricAndLogin = async (
  loginFunction: (username: string, password: string) => Promise<any>
): Promise<BiometricResult> => {
  try {
    // Vérifier si l'authentification biométrique est activée
    const isEnabled = await isBiometricEnabled();
    if (!isEnabled) {
      return {
        success: false,
        error: 'Authentification biométrique non activée',
      };
    }

    // Récupérer les identifiants sauvegardés
    const credentials = await getCredentialsForBiometric();
    if (!credentials) {
      return {
        success: false,
        error: 'Aucun identifiant sauvegardé trouvé',
      };
    }

    // Effectuer l'authentification biométrique
    const biometricResult = await authenticateWithBiometrics({
      promptMessage: 'Authentifiez-vous pour accéder à NAJDA',
      fallbackLabel: 'Utiliser le mot de passe',
    });

    if (biometricResult.success) {
      // Si l'authentification biométrique réussit, se connecter automatiquement
      try {
        await loginFunction(credentials.username, credentials.password);
        console.log('✅ Connexion automatique réussie via biométrie');
        return {
          success: true,
          type: biometricResult.type,
        };
      } catch (loginError: any) {
        console.error('❌ Erreur lors de la connexion automatique:', loginError);
        return {
          success: false,
          error: 'Échec de la connexion automatique',
        };
      }
    } else {
      return biometricResult;
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'authentification biométrique complète:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'authentification biométrique',
    };
  }
};

export default {
  isBiometricAvailable,
  getAvailableBiometricTypes,
  getBiometricTypeName,
  authenticateWithBiometrics,
  setupBiometricAuth,
  isBiometricEnabled,
  disableBiometricAuth,
  autoAuthenticateWithBiometrics,
  saveCredentialsForBiometric,
  getCredentialsForBiometric,
  clearBiometricCredentials,
  authenticateWithBiometricAndLogin,
};
