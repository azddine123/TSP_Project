/**
 * ÉCRAN DE LOGIN — Authentification Keycloak via PKCE
 * ====================================================
 * Flux : Bouton "Se connecter" → ouvre le navigateur système sur la page
 * de login Keycloak → Keycloak redirige vers logistique://callback →
 * expo-auth-session intercepte le code → échange contre un JWT →
 * JWT stocké chiffré dans expo-secure-store → navigation vers l'app.
 *
 * Inspiré de labcollect-mobile/app/(auth)/login.tsx
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Image, StatusBar,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto      from 'expo-crypto';
import { useRouter }    from 'expo-router';
import { useAuth }      from '../contexts/AuthContext';
import { AuthUser }     from '../types/app';
import {
  KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID, REDIRECT_URI,
} from '../config/keycloakConfig';

const DISCOVERY = {
  authorizationEndpoint:
    `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`,
  tokenEndpoint:
    `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
  revocationEndpoint:
    `${KEYCLOAK_SERVER}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`,
};

export default function LoginScreen() {
  const { saveSession }  = useAuth();
  const router           = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    try {
      // Générer le code_verifier PKCE (sécurité contre l'interception du code)
      const codeVerifier  = AuthSession.generateHmac
        ? await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            Math.random().toString(),
          )
        : AuthSession.generateHmac;

      const request = new AuthSession.AuthRequest({
        clientId:            KEYCLOAK_CLIENT_ID,
        redirectUri:         REDIRECT_URI,
        scopes:              ['openid', 'profile', 'email'],
        usePKCE:             true,
        responseType:        AuthSession.ResponseType.Code,
      });

      const result = await request.promptAsync(DISCOVERY);

      if (result.type !== 'success') {
        if (result.type === 'cancel') {
          setLoading(false);
          return;
        }
        throw new Error(`Authentification échouée : ${result.type}`);
      }

      // Échanger le code d'autorisation contre un JWT
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          code:         result.params.code,
          clientId:     KEYCLOAK_CLIENT_ID,
          redirectUri:  REDIRECT_URI,
          extraParams:  { code_verifier: request.codeVerifier || '' },
        },
        DISCOVERY,
      );

      if (!tokenResponse.accessToken) {
        throw new Error('Token non reçu depuis Keycloak.');
      }

      // Décoder le payload JWT pour extraire l'utilisateur et ses rôles
      const payload = JSON.parse(
        atob(tokenResponse.accessToken.split('.')[1]),
      );

      const roles: string[] = [
        ...(payload.roles || []),
        ...(payload.realm_access?.roles || []),
      ].filter((r: string) =>
        ['SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR'].includes(r),
      );

      if (!roles.includes('DISTRIBUTEUR')) {
        Alert.alert(
          'Accès Refusé',
          `L'application mobile est réservée aux Distributeurs.\nVotre rôle : ${roles[0] || 'inconnu'}`,
        );
        setLoading(false);
        return;
      }

      const authUser: AuthUser = {
        userId:   payload.sub,
        username: payload.preferred_username,
        email:    payload.email || '',
        roles,
      };

      // Stocker le JWT chiffré via expo-secure-store
      await saveSession(
        tokenResponse.accessToken,
        tokenResponse.refreshToken || '',
        authUser,
      );

      router.replace('/(tabs)/home');

    } catch (err: any) {
      console.error('[Login]', err);
      Alert.alert(
        'Erreur de connexion',
        err.message || 'Impossible de contacter le serveur Keycloak.',
        [{ text: 'Réessayer' }],
      );
    } finally {
      setLoading(false);
    }
  }, [saveSession, router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />

      {/* Logo / En-tête institutionnel */}
      <View style={styles.header}>
        <Text style={styles.emoji}>🏔️</Text>
        <Text style={styles.title}>MTSPC26</Text>
        <Text style={styles.subtitle}>Logistique Humanitaire</Text>
        <Text style={styles.region}>Région Béni Mellal-Khénifra</Text>
      </View>

      {/* Carte de connexion */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Espace Distributeur</Text>
        <Text style={styles.cardDesc}>
          Connectez-vous avec votre compte institutionnel pour accéder
          à vos missions de livraison.
        </Text>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>🔐  Se connecter via Keycloak</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          🔒 Authentification SSO sécurisée · OAuth 2.0 / PKCE
        </Text>
      </View>

      <Text style={styles.footer}>
        Plateforme sécurisée de gestion des données
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#0D47A1',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         24,
  },
  header: {
    alignItems:   'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize:     64,
    marginBottom: 12,
  },
  title: {
    fontSize:    32,
    fontWeight:  '800',
    color:       '#fff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize:   18,
    color:      'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop:  4,
  },
  region: {
    fontSize:  13,
    color:     'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  card: {
    width:           '100%',
    backgroundColor: '#fff',
    borderRadius:    16,
    padding:         28,
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.2,
    shadowRadius:    8,
    elevation:       8,
  },
  cardTitle: {
    fontSize:     22,
    fontWeight:   '700',
    color:        '#1A237E',
    marginBottom: 10,
  },
  cardDesc: {
    fontSize:     14,
    color:        '#666',
    textAlign:    'center',
    lineHeight:   22,
    marginBottom: 28,
  },
  loginButton: {
    width:           '100%',
    backgroundColor: '#1565C0',
    paddingVertical: 16,
    borderRadius:    10,
    alignItems:      'center',
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
    marginTop: 16,
    fontSize:  12,
    color:     '#90A4AE',
  },
  footer: {
    marginTop: 32,
    color:     'rgba(255,255,255,0.5)',
    fontSize:  12,
  },
});
