/**
 * ÉCRAN DE LOGIN PERSONNALISÉ — Formulaire username / password + Biométrie
 * =========================================================================
 * Appel direct à l'endpoint token Keycloak (grant_type=password).
 * La biométrie déverrouille les tokens déjà stockés — aucun appel réseau.
 *
 * Flux biométrique :
 *   Au montage → si isBiometricPending (session valide + biométrie activée)
 *     → prompt automatique au démarrage
 *     → succès : unlockWithBiometrics() → navigation vers home
 *     → annulation : affiche le formulaire + bouton biométrique manuel
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  StatusBar, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth }         from '../../contexts/AuthContext';
import { useRouter }       from 'expo-router';
import { useBiometrics }   from '../../hooks/useBiometrics';
import { AuthUser }        from '../../types/app';
import {
  KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID,
} from '../../config/keycloakConfig';

// ── Icônes biométrie (sans dépendance externe) ─────────────────────────────

const BIOMETRIC_ICONS: Record<string, string> = {
  fingerprint: '🫆',
  faceid:      '👤',
  iris:        '👁️',
  none:        '🔐',
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { saveSession, isBiometricPending, isBiometricEnabled, unlockWithBiometrics } = useAuth();
  const router                  = useRouter();
  const biometrics              = useBiometrics();

  const [username,      setUsername]      = useState('');
  const [password,      setPassword]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [biometricLoad, setBiometricLoad] = useState(false);
  const [showPass,      setShowPass]      = useState(false);

  // ── Déverrouillage biométrique ─────────────────────────────────────────────

  const handleBiometricUnlock = useCallback(async () => {
    if (!biometrics.isAvailable) return;
    setBiometricLoad(true);
    try {
      const icon  = BIOMETRIC_ICONS[biometrics.biometricType] ?? '🔐';
      const label = biometrics.biometricType === 'faceid'
        ? 'Scannez votre visage pour accéder à ReliefChain'
        : 'Posez le doigt pour accéder à ReliefChain';

      const biometricSuccess = await biometrics.authenticate(label);

      if (!biometricSuccess) {
        // L'utilisateur a annulé ou a échoué — on ne montre rien,
        // le formulaire est déjà visible en fallback.
        return;
      }

      const sessionRestored = await unlockWithBiometrics();
      if (sessionRestored) {
        router.replace('/(tabs)/home');
      } else {
        // Session expirée entre-temps → forcer reconnexion complète
        Alert.alert(
          'Session expirée',
          'Votre session a expiré. Veuillez vous reconnecter avec vos identifiants.',
        );
      }
    } finally {
      setBiometricLoad(false);
    }
  }, [biometrics, unlockWithBiometrics, router]);

  // Prompt biométrique automatique au montage si une session est en attente
  useEffect(() => {
    if (isBiometricPending && biometrics.isAvailable && !biometrics.isChecking) {
      handleBiometricUnlock();
    }
  // Intentionnellement déclenché une seule fois après la vérification initiale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometrics.isChecking]);

  // ── Login Keycloak ─────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir votre identifiant et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const tokenUrl = `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

      const body = new URLSearchParams({
        grant_type: 'password',
        client_id:  KEYCLOAK_CLIENT_ID,
        username:   username.trim(),
        password:   password,
        scope:      'openid profile email',
      });

      const response = await fetch(tokenUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error_description || data.error || 'Identifiants incorrects.';
        Alert.alert('Connexion refusée', msg);
        return;
      }

      if (!data.access_token) {
        Alert.alert('Erreur', 'Token non reçu depuis le serveur.');
        return;
      }

      // Décoder le JWT pour extraire le profil et les rôles
      const payload = parseJWT(data.access_token);

      const roles: string[] = [
        ...(payload.roles               || []),
        ...(payload.realm_access?.roles || []),
      ].filter((r: string) =>
        ['SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR'].includes(r),
      );

      if (!roles.includes('DISTRIBUTEUR')) {
        Alert.alert(
          'Accès Refusé',
          `L'application mobile est réservée aux Distributeurs.\nRôle détecté : ${roles[0] || 'aucun'}`,
        );
        return;
      }

      const user: AuthUser = {
        userId:   payload.sub,
        username: payload.preferred_username,
        email:    payload.email || '',
        roles,
      };

      await saveSession(data.access_token, data.refresh_token || '', user);
      router.replace('/(tabs)/home');

    } catch (err) {
      console.error('[Login]', err);
      Alert.alert('Erreur réseau', 'Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  // Afficher le bouton biométrique si :
  // - la biométrie est disponible sur l'appareil
  // - ET la préférence est activée OU une session est en attente de déverrouillage
  const showBiometricButton =
    biometrics.isAvailable && (isBiometricEnabled || isBiometricPending);

  const biometricIcon  = BIOMETRIC_ICONS[biometrics.biometricType] ?? '🔐';
  const biometricLabel = biometrics.biometricType === 'faceid'
    ? 'Déverrouiller avec Face ID'
    : 'Déverrouiller avec empreinte';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🏔️</Text>
          <Text style={styles.title}>ReliefChain</Text>
          <Text style={styles.subtitle}>Logistique Humanitaire</Text>
          <Text style={styles.region}>Région Béni Mellal-Khénifra</Text>
        </View>

        {/* Carte formulaire */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Espace Distributeur</Text>
          <Text style={styles.cardDesc}>
            {isBiometricPending
              ? 'Utilisez votre biométrie ou connectez-vous manuellement.'
              : 'Connectez-vous avec votre compte institutionnel.'}
          </Text>

          {/* ── Bouton biométrique (affiché si dispo + activé) ── */}
          {showBiometricButton && (
            <TouchableOpacity
              style={[styles.biometricButton, biometricLoad && styles.biometricButtonDisabled]}
              onPress={handleBiometricUnlock}
              disabled={biometricLoad}
              activeOpacity={0.8}
            >
              {biometricLoad ? (
                <ActivityIndicator color="#1565C0" size="small" />
              ) : (
                <>
                  <Text style={styles.biometricIcon}>{biometricIcon}</Text>
                  <Text style={styles.biometricLabel}>{biometricLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Séparateur "ou" si biométrie disponible */}
          {showBiometricButton && (
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>
          )}

          {/* Champ identifiant */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Identifiant</Text>
            <TextInput
              style={styles.input}
              placeholder="ex : distributeur.khenifra"
              placeholderTextColor="#aaa"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Champ mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPass(v => !v)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton connexion */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.loginButtonText}>Se connecter</Text>
            }
          </TouchableOpacity>

          <Text style={styles.securityNote}>
            🔒 Authentification sécurisée · Keycloak SSO
          </Text>
        </View>

        <Text style={styles.footer}>
          Plateforme sécurisée de gestion des données
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  container: {
    flexGrow:        1,
    backgroundColor: '#0D47A1',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         24,
  },
  header: {
    alignItems:   'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize:     56,
    marginBottom: 10,
  },
  title: {
    fontSize:      30,
    fontWeight:    '800',
    color:         '#fff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize:   16,
    color:      'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop:  4,
  },
  region: {
    fontSize:  12,
    color:     'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  card: {
    width:           '100%',
    backgroundColor: '#fff',
    borderRadius:    16,
    padding:         24,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.2,
    shadowRadius:    8,
    elevation:       8,
  },
  cardTitle: {
    fontSize:     20,
    fontWeight:   '700',
    color:        '#1A237E',
    marginBottom: 6,
    textAlign:    'center',
  },
  cardDesc: {
    fontSize:     13,
    color:        '#666',
    textAlign:    'center',
    marginBottom: 20,
  },
  // ── Biométrie ──
  biometricButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             10,
    borderWidth:     2,
    borderColor:     '#1565C0',
    borderRadius:    10,
    paddingVertical: 13,
    marginBottom:    4,
    backgroundColor: '#EEF4FF',
  },
  biometricButtonDisabled: {
    borderColor:     '#90A4AE',
    backgroundColor: '#F5F5F5',
  },
  biometricIcon: {
    fontSize: 22,
  },
  biometricLabel: {
    fontSize:   15,
    fontWeight: '600',
    color:      '#1565C0',
  },
  separator: {
    flexDirection:  'row',
    alignItems:     'center',
    marginVertical: 16,
    gap:            8,
  },
  separatorLine: {
    flex:            1,
    height:          1,
    backgroundColor: '#E0E0E0',
  },
  separatorText: {
    fontSize: 12,
    color:    '#999',
  },
  // ── Formulaire ──
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize:     13,
    fontWeight:   '600',
    color:        '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth:       1,
    borderColor:       '#ddd',
    borderRadius:      8,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:          15,
    color:             '#222',
    backgroundColor:   '#fafafa',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  eyeBtn: {
    padding: 10,
  },
  eyeText: {
    fontSize: 18,
  },
  loginButton: {
    width:           '100%',
    backgroundColor: '#1565C0',
    paddingVertical: 15,
    borderRadius:    10,
    alignItems:      'center',
    marginTop:       8,
  },
  loginButtonDisabled: {
    backgroundColor: '#90A4AE',
  },
  loginButtonText: {
    color:      '#fff',
    fontSize:   16,
    fontWeight: '700',
  },
  securityNote: {
    marginTop:  14,
    fontSize:   11,
    color:      '#90A4AE',
    textAlign:  'center',
  },
  footer: {
    marginTop: 28,
    color:     'rgba(255,255,255,0.5)',
    fontSize:  12,
  },
});
