/**
 * BIOMETRIC SETTINGS SCREEN — MTSPC Mobile
 * ==========================================
 * Inspiré de LabCollect BiometricSettingsScreen.
 * Utilise les utilitaires biométriques existants de mtspc-mobile.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { isBiometricAvailable } from './utils/biometricUtils';

const C = {
  primary:  '#1565C0',
  success:  '#2E7D32',
  error:    '#D32F2F',
  bg:       '#F5F5F5',
  surface:  '#fff',
  border:   '#E0E0E0',
  textPri:  '#212121',
  textSec:  '#757575',
  white:    '#fff',
};

export default function BiometricSettingsScreen() {
  const router = useRouter();
  // isBiometricEnabled et setBiometricEnabled viennent de l'AuthContext
  // (clé SecureStore 'reliefchain_biometric_isBiometricEnabled') — même source que le login
  const { isBiometricEnabled, setBiometricEnabled } = useAuth();

  const [available, setAvailable] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [testing,   setTesting]   = useState(false);

  useEffect(() => {
    isBiometricAvailable()
      .then(setAvailable)
      .finally(() => setLoading(false));
  }, []);

  /**
   * Activation : on fait scanner l'empreinte d'abord pour vérifier que ça marche,
   * puis on enregistre la préférence via AuthContext (même clé que le login).
   * Désactivation : on met à jour la préférence directement (pas besoin de scanner).
   */
  const handleToggle = async (value: boolean) => {
    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirmer l\'activation de la biométrie',
          fallbackLabel: 'Annuler',
          cancelLabel: 'Annuler',
          disableDeviceFallback: false,
        });
        if (result.success) {
          await setBiometricEnabled(true);
          Alert.alert('Activée', 'L\'authentification biométrique a été activée avec succès.');
        } else {
          Alert.alert('Annulé', 'La biométrie n\'a pas été activée.');
        }
      } catch {
        Alert.alert('Erreur', 'Impossible d\'activer la biométrie.');
      }
    } else {
      Alert.alert(
        'Désactiver la biométrie',
        'Êtes-vous sûr de vouloir désactiver l\'authentification biométrique ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Désactiver',
            style: 'destructive',
            onPress: async () => {
              await setBiometricEnabled(false);
              Alert.alert('Désactivée', 'L\'authentification biométrique a été désactivée.');
            },
          },
        ]
      );
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Test de l\'authentification biométrique',
        fallbackLabel: 'Annuler',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });
      if (result.success) {
        Alert.alert('Test réussi ✓', 'Votre authentification biométrique fonctionne correctement !');
      } else {
        Alert.alert('Test échoué', 'L\'authentification biométrique a échoué.');
      }
    } finally {
      setTesting(false);
    }
  };

  const renderStatus = () => {
    if (loading) {
      return (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>Vérification en cours...</Text>
        </View>
      );
    }
    if (!available) {
      return (
        <View style={styles.statusCard}>
          <Ionicons name="alert-circle" size={48} color={C.error} />
          <Text style={styles.statusTitle}>Biométrie non disponible</Text>
          <Text style={styles.statusText}>
            Votre appareil ne supporte pas l'authentification biométrique ou aucune empreinte n'est configurée.
          </Text>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => Alert.alert(
              'Comment configurer ?',
              '1. Vérifiez que votre appareil supporte la biométrie\n2. Configurez une empreinte digitale ou reconnaissance faciale\n3. Activez le verrouillage de l\'écran\n4. Redémarrez l\'application'
            )}
          >
            <Text style={styles.helpBtnText}>Comment configurer ?</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.statusCard}>
        <Ionicons
          name={isBiometricEnabled ? 'finger-print' : 'finger-print'}
          size={48}
          color={isBiometricEnabled ? C.success : C.textSec}
        />
        <Text style={styles.statusTitle}>
          {isBiometricEnabled ? 'Biométrie activée' : 'Biométrie désactivée'}
        </Text>
        <Text style={styles.statusText}>
          {isBiometricEnabled
            ? 'Vous pouvez utiliser votre empreinte digitale ou reconnaissance faciale pour vous connecter.'
            : 'Activez l\'authentification biométrique pour une connexion plus rapide et sécurisée.'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPri} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Authentification biométrique</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Statut */}
        {renderStatus()}

        {/* Configuration */}
        {available && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuration</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="finger-print" size={24} color={C.primary} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>Authentification biométrique</Text>
                    <Text style={styles.rowSub}>Empreinte digitale ou reconnaissance faciale</Text>
                  </View>
                </View>
                <Switch
                  value={isBiometricEnabled}
                  onValueChange={handleToggle}
                  trackColor={{ false: C.border, true: '#90CAF9' }}
                  thumbColor={isBiometricEnabled ? C.primary : '#757575'}
                  disabled={loading}
                />
              </View>
            </View>
          </View>
        )}

        {/* Test */}
        {available && isBiometricEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.testBtn, testing && styles.testBtnDisabled]}
                onPress={handleTest}
                disabled={testing}
              >
                <Ionicons name="checkmark-circle" size={22} color={C.white} />
                <Text style={styles.testBtnText}>
                  {testing ? 'Test en cours...' : 'Tester la biométrie'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.testDesc}>
                Vérifiez que votre authentification biométrique fonctionne correctement.
              </Text>
            </View>
          </View>
        )}

        {/* Informations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.card}>
            {[
              { icon: 'shield-checkmark' as const, color: C.success, text: "L'authentification biométrique est sécurisée et vos données ne quittent jamais votre appareil." },
              { icon: 'lock-closed' as const, color: C.primary, text: 'Vous pouvez toujours utiliser votre mot de passe si la biométrie échoue.' },
              { icon: 'phone-portrait' as const, color: C.textSec, text: "Fonctionne avec l'empreinte digitale, la reconnaissance faciale et l'iris." },
            ].map((info, i, arr) => (
              <View key={i} style={[styles.infoRow, i < arr.length - 1 && styles.itemBorder]}>
                <Ionicons name={info.icon} size={20} color={info.color} />
                <Text style={styles.infoText}>{info.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.textPri },
  content: { padding: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPri,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 13,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 20,
  },
  helpBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: C.primary,
    borderRadius: 8,
  },
  helpBtnText: { fontSize: 13, fontWeight: '600', color: C.white },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowText: { marginLeft: 12, flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.textPri },
  rowSub: { fontSize: 12, color: C.textSec, marginTop: 2 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  testBtnDisabled: { backgroundColor: C.textSec },
  testBtnText: { fontSize: 15, fontWeight: '600', color: C.white },
  testDesc: { fontSize: 12, color: C.textSec, textAlign: 'center' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  infoText: { fontSize: 13, color: C.textSec, flex: 1, lineHeight: 19 },
});
