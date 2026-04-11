/**
 * PROFILE SCREEN
 * ==============
 * Page profil simplifiée.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { syncService, getDisplayStatus } from '../../services/syncService';
import type { PendingSubmission } from '../../types/app';

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();

  const [syncStats, setSyncStats] = useState({ pending: 0, synced: 0, failed: 0 });
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const [pending, submissions] = await Promise.all([
        syncService.getPendingCount(),
        syncService.getPendingSubmissions(),
      ]);
      const syncedRaw = await AsyncStorage.getItem('sync_stats');
      const synced = syncedRaw ? JSON.parse(syncedRaw).synced : 0;
      const failed = submissions.filter(s => s.tentativeSync > 3).length;
      setSyncStats({ pending, synced, failed });
      setPendingSubmissions(submissions);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setIsLoading(false);
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

      {/* Soumissions en attente */}
      {pendingSubmissions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soumissions en attente ({pendingSubmissions.length})</Text>
          {pendingSubmissions.map((sub, idx) => {
            const displayStatus = getDisplayStatus(sub);
            return (
              <View key={`${sub.missionId}-${sub.douarId ?? idx}`} style={styles.submissionRow}>
                {/* Icône statut */}
                {displayStatus === 'failed' ? (
                  <Ionicons name="close-circle" size={20} color="#D32F2F" />
                ) : (
                  <Ionicons name="time" size={20} color="#F57C00" />
                )}
                <View style={styles.submissionInfo}>
                  <Text style={styles.submissionMission} numberOfLines={1}>
                    Mission : {sub.missionId}
                  </Text>
                  {sub.douarId && (
                    <Text style={styles.submissionDouar} numberOfLines={1}>
                      Douar : {sub.livraison?.douarNom ?? sub.douarId}
                    </Text>
                  )}
                  <Text style={styles.submissionTime}>
                    {new Date(sub.timestampLocal).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </Text>
                </View>
                <View style={[
                  styles.submissionBadge,
                  displayStatus === 'failed' ? styles.submissionBadgeFailed : styles.submissionBadgePending,
                ]}>
                  <Text style={[
                    styles.submissionBadgeText,
                    displayStatus === 'failed' ? styles.submissionBadgeTextFailed : styles.submissionBadgeTextPending,
                  ]}>
                    {displayStatus === 'failed' ? `Échec (${sub.tentativeSync})` : `Tentative ${sub.tentativeSync}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Paramètres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={20} color="#1565C0" />
          <Text style={styles.actionButtonText}>Paramètres de l'application</Text>
          <Ionicons name="chevron-forward" size={20} color="#757575" />
        </TouchableOpacity>
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

  // Soumissions en attente
  submissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 10,
  },
  submissionInfo: {
    flex: 1,
    minWidth: 0,
  },
  submissionMission: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
  },
  submissionDouar: {
    fontSize: 12,
    color: '#616161',
    marginTop: 2,
  },
  submissionTime: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 2,
  },
  submissionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  submissionBadgePending: {
    backgroundColor: '#FFF3E0',
  },
  submissionBadgeFailed: {
    backgroundColor: '#FFEBEE',
  },
  submissionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  submissionBadgeTextPending: {
    color: '#E65100',
  },
  submissionBadgeTextFailed: {
    color: '#B71C1C',
  },
});
