/**
 * PROFILE SCREEN
 * ==============
 * Page profil simplifiée.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { syncService } from '../../services/syncService';

export default function ProfileScreen() {
  const { logout, user, isBiometricEnabled, setBiometricEnabled } = useAuth();
  const router = useRouter();

  const [biometricSupported, setBiometricSupported] = useState(true);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [syncStats, setSyncStats] = useState({ pending: 0, synced: 0, failed: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const pending = await syncService.getPendingCount();
      const syncedRaw = await AsyncStorage.getItem('sync_stats');
      const synced = syncedRaw ? JSON.parse(syncedRaw).synced : 0;
      const failed = syncedRaw ? JSON.parse(syncedRaw).failed : 0;
      setSyncStats({ pending, synced, failed });
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!biometricSupported) {
      Alert.alert('Non supporté', 'L\'authentification biométrique n\'est pas disponible.');
      return;
    }

    setBiometricLoading(true);
    try {
      if (enabled) {
        const result = await SecureStore.getItemAsync('refreshToken');
        if (!result) {
          Alert.alert('Erreur', 'Connectez-vous d\'abord.');
          return;
        }
      }
      await setBiometricEnabled(enabled);
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Confirmez-vous la déconnexion ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.userName}>{user?.username || 'Utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'email@exemple.com'}</Text>
        <Text style={styles.userRole}>{user?.roles?.[0] || 'Distributeur'}</Text>
      </View>

      {/* Stats sync */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Synchronisation</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{syncStats.pending}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{syncStats.synced}</Text>
            <Text style={styles.statLabel}>Synchronisés</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{syncStats.failed}</Text>
            <Text style={styles.statLabel}>Échecs</Text>
          </View>
        </View>
      </View>

      {/* Paramètres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="finger-print" size={22} color="#1565C0" />
            <Text style={styles.settingLabel}>Authentification biométrique</Text>
          </View>
          {biometricLoading ? (
            <ActivityIndicator size="small" color="#1565C0" />
          ) : (
            <Switch
              value={isBiometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#E0E0E0', true: '#90CAF9' }}
              thumbColor={isBiometricEnabled ? '#1565C0' : '#757575'}
            />
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/home')}>
          <Ionicons name="document-text-outline" size={20} color="#1565C0" />
          <Text style={styles.actionButtonText}>Mes missions</Text>
          <Ionicons name="chevron-forward" size={20} color="#757575" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={async () => {
            try {
              const { synced, failed } = await syncService.forceSync();
              Alert.alert('Synchronisation', `${synced} synchronisé(s), ${failed} échec(s)`);
              loadProfileData();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de synchroniser');
            }
          }}
        >
          <Ionicons name="sync" size={20} color="#1565C0" />
          <Text style={styles.actionButtonText}>Forcer la synchronisation</Text>
          <Ionicons name="chevron-forward" size={20} color="#757575" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={() => {
            Alert.alert(
              'Confirmer',
              'Effacer toutes les données locales ?',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Effacer',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const keys = await AsyncStorage.getAllKeys();
                      await AsyncStorage.multiRemove(keys);
                      Alert.alert('Succès', 'Cache effacé.');
                      loadProfileData();
                    } catch (e) {
                      Alert.alert('Erreur', 'Échec de l\'opération');
                    }
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#D32F2F" />
          <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Effacer le cache</Text>
          <Ionicons name="chevron-forward" size={20} color="#757575" />
        </TouchableOpacity>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>MTSPC v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#1565C0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#212121',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionButtonDanger: {
    borderColor: '#FFCDD2',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#212121',
    marginLeft: 12,
  },
  actionButtonTextDanger: {
    color: '#D32F2F',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
  },

  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 16,
    marginBottom: 32,
  },
});
