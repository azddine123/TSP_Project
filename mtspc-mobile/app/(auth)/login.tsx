/**
 * ÉCRAN DE LOGIN — Style LabCollect adapté pour NAJDA
 * ====================================================
 * Authentification biométrique en deux étapes :
 *  1. Scan biométrique (LocalAuthentication)
 *  2a. JWT unlock offline (unlockWithBiometrics) — si tokens encore valides
 *  2b. Re-login avec credentials chiffrés (SecureStore) — si tokens expirés
 *
 * Les credentials sont sauvegardés de manière chiffrée après chaque login réussi
 * (uniquement si la biométrie est activée), identique au comportement LabCollect.
 */
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { isBiometricAvailable } from '../utils/biometricUtils';

const NAJDA_LOGO = require('../../assets/images/NAJDA_Logo.png');

/** Clé SecureStore pour les credentials biométriques chiffrés */
const BIOMETRIC_CRED_KEY = 'najda_biometric_credentials';

export default function LoginScreen() {
  const { saveSession, isBiometricEnabled, isBiometricPending, unlockWithBiometrics } = useAuth();
  const router = useRouter();

  const [username,          setUsername]          = useState('');
  const [password,          setPassword]          = useState('');
  const [errorMessage,      setErrorMessage]      = useState<string | null>(null);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading,           setLoading]           = useState(false);

  const formOpacity     = useSharedValue(0);
  const formTranslateY  = useSharedValue(30);
  const errorShakeX     = useSharedValue(0);

  useEffect(() => {
    formOpacity.value    = withSpring(1);
    formTranslateY.value = withSpring(0);
    checkBiometricAvailability();
  }, []);

  // Déclenche automatiquement la biométrie si une session est en attente
  useEffect(() => {
    if (isBiometricPending && biometricAvailable && !loading) {
      handleBiometricAuth();
    }
  }, [isBiometricPending, biometricAvailable]);

  const checkBiometricAvailability = async () => {
    if (Platform.OS === 'web') return;
    try {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    } catch (err) {
      console.error('Erreur vérification biométrique:', err);
    }
  };

  // ── Appels Keycloak ──────────────────────────────────────────────────────────

  const loginWithCredentials = async (user: string, pass: string) => {
    const { KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID } =
      await import('../../config/keycloakConfig');

    const tokenUrl = `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id:  KEYCLOAK_CLIENT_ID,
      username:   user.trim(),
      password:   pass,
      scope:      'openid profile email',
    });

    const response = await fetch(tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Identifiants incorrects');

    const payload  = parseJWT(data.access_token);
    const authUser = {
      userId:   payload.sub,
      username: payload.preferred_username,
      email:    payload.email || '',
      roles:    payload.realm_access?.roles || [],
    };

    await saveSession(data.access_token, data.refresh_token || '', authUser);
    return authUser;
  };

  // ── Authentification biométrique ─────────────────────────────────────────────

  /**
   * Flux biométrique (même logique que LabCollect) :
   * 1. Scan biométrique via LocalAuthentication
   * 2a. JWT unlock (offline, rapide) — si tokens encore valides
   * 2b. Re-login avec credentials chiffrés — si tokens expirés
   * 3.  Erreur → reconnexion manuelle
   */
  const handleBiometricAuth = async () => {
    setLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:         'Accéder à NAJDA',
        fallbackLabel:         'Utiliser le mot de passe',
        cancelLabel:           'Annuler',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        setErrorMessage('Authentification biométrique annulée ou échouée.');
        shakeError();
        return;
      }

      // ── Chemin 1 : JWT unlock offline ─────────────────────────────────────
      const unlocked = await unlockWithBiometrics();
      if (unlocked) {
        router.replace('/(tabs)/home');
        return;
      }

      // ── Chemin 2 : re-login avec credentials chiffrés (tokens expirés) ────
      const storedRaw = await SecureStore.getItemAsync(BIOMETRIC_CRED_KEY);
      if (storedRaw) {
        try {
          const { u, p } = JSON.parse(storedRaw);
          await loginWithCredentials(u, p);
          router.replace('/(tabs)/home');
          return;
        } catch {
          // Credentials invalides (mot de passe changé ?) → les supprimer
          await SecureStore.deleteItemAsync(BIOMETRIC_CRED_KEY);
        }
      }

      // ── Chemin 3 : impossible de déverrouiller ─────────────────────────────
      setErrorMessage('Session expirée. Veuillez vous reconnecter manuellement.');
      shakeError();
    } catch (err: any) {
      console.error('Erreur biométrique:', err);
      setErrorMessage("Erreur lors de l'authentification biométrique.");
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  // ── Login manuel ─────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!username.trim()) {
      setErrorMessage("Veuillez entrer votre nom d'utilisateur.");
      shakeError();
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Veuillez entrer votre mot de passe.');
      shakeError();
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      await loginWithCredentials(username, password);

      // Sauvegarder les credentials chiffrés pour la biométrie
      // (uniquement si la biométrie est activée ou disponible pour activation future)
      if (biometricAvailable) {
        await SecureStore.setItemAsync(
          BIOMETRIC_CRED_KEY,
          JSON.stringify({ u: username, p: password }),
        );
      }

      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('❌ Erreur de connexion:', err);
      setErrorMessage(err.message || 'Échec de l\'authentification. Vérifiez vos identifiants.');
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  // ── Animations ────────────────────────────────────────────────────────────────

  const shakeError = () => {
    errorShakeX.value = withSequence(
      withTiming(-10, { duration: 80, easing: Easing.bounce }),
      withTiming(10,  { duration: 80, easing: Easing.bounce }),
      withTiming(-10, { duration: 80, easing: Easing.bounce }),
      withTiming(0,   { duration: 80, easing: Easing.bounce }),
    );
  };

  const formAnimatedStyle  = useAnimatedStyle(() => ({
    opacity:   formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const errorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShakeX.value }],
  }));

  // ── Render ────────────────────────────────────────────────────────────────────

  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.redirectContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.redirectText}>Connexion réussie</Text>
          <Text style={styles.redirectSubtext}>Redirection en cours...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Le bouton biométrique apparaît si :
  //  - le hardware biométrique est disponible
  //  - ET la biométrie est activée dans les préférences utilisateur
  const showBiometricButton = biometricAvailable && isBiometricEnabled;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image source={NAJDA_LOGO} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.title}>NAJDA</Text>
              <Text style={styles.subtitle}>Plateforme de gestion des missions</Text>
            </View>

            {/* Bouton biométrique */}
            {showBiometricButton && (
              <View style={styles.biometricSection}>
                <TouchableOpacity
                  style={[styles.biometricButton, loading && styles.biometricButtonDisabled]}
                  onPress={handleBiometricAuth}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#1565C0" />
                  ) : (
                    <Icon name="fingerprint" size={32} color="#1565C0" />
                  )}
                  <Text style={styles.biometricButtonText}>
                    {loading ? 'Vérification...' : 'Se connecter avec la biométrie'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>
            )}

            {/* Formulaire */}
            <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
              <View style={styles.inputContainer}>
                <Icon name="account" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nom d'utilisateur"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isPasswordFocused && styles.inputFocused]}
                  placeholder="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  autoComplete="password"
                  editable={!loading}
                />
              </View>

              {errorMessage && (
                <Animated.View style={[styles.errorContainer, errorAnimatedStyle]}>
                  <Icon name="alert-circle" size={16} color="#F44336" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </Animated.View>
              )}

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="login" size={20} color="#fff" />
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Utilitaire JWT ─────────────────────────────────────────────────────────────

function parseJWT(token: string): Record<string, any> {
  const base64Url = token.split('.')[1];
  const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded    = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return JSON.parse(atob(padded));
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f8f9fa' },
  keyboardView:     { flex: 1 },
  scrollContent:    { flexGrow: 1, justifyContent: 'center' },
  content:          { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  redirectContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  redirectText:     { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#1565C0', textAlign: 'center' },
  redirectSubtext:  { marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center' },
  header:           { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 220, height: 130, borderRadius: 12,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  logo:             { width: 200, height: 110, borderRadius: 8 },
  title:            { fontSize: 32, fontWeight: 'bold', color: '#1565C0', marginBottom: 8, letterSpacing: 2 },
  subtitle:         { fontSize: 16, color: '#666', textAlign: 'center' },
  biometricSection: { marginBottom: 24 },
  biometricButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E3F2FD', paddingVertical: 16, paddingHorizontal: 24,
    borderRadius: 12, borderWidth: 1, borderColor: '#1565C0', gap: 12,
  },
  biometricButtonDisabled: { opacity: 0.6 },
  biometricButtonText:     { fontSize: 16, fontWeight: '600', color: '#1565C0' },
  divider:          { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  dividerLine:      { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText:      { marginHorizontal: 16, fontSize: 14, color: '#666' },
  formContainer:    { marginBottom: 24 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, marginBottom: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#E0E0E0', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  inputIcon:        { marginRight: 12 },
  input:            { flex: 1, paddingVertical: 16, fontSize: 16, color: '#333' },
  inputFocused:     { borderColor: '#1565C0' },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 16,
  },
  errorText:        { fontSize: 14, color: '#F44336', marginLeft: 8, flex: 1 },
  loginButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1565C0', paddingVertical: 16, borderRadius: 12, marginTop: 8,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, gap: 8,
  },
  loginButtonDisabled: { backgroundColor: '#90A4AE' },
  loginButtonText:     { fontSize: 16, fontWeight: '600', color: '#fff' },
});
