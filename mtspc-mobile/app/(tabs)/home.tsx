/**
 * HOME SCREEN - Dashboard des missions
 * ====================================
 * Liste simple des missions avec filtres basiques.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MissionCard from '../../components/MissionCard';
import { useAuth } from '../../contexts/AuthContext';
import { missionService } from '../../services/missionService';
import { syncService } from '../../services/syncService';
import { Mission } from '../../types/app';

const MISSIONS_CACHE_KEY = 'missions_cache';

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing,       setSyncing]       = useState(false);
  const [filterStatut,  setFilterStatut]  = useState<string>(''); // '' = toutes

  // Charger les missions
  const loadMissions = useCallback(async () => {
    try {
      setError(null);
      const netInfo = await NetInfo.fetch();
      const online = !!(netInfo.isConnected && netInfo.isInternetReachable);
      setIsOnline(online);

      if (online) {
        const data = await missionService.getAllMissions();
        setMissions(data);
        await AsyncStorage.setItem(MISSIONS_CACHE_KEY, JSON.stringify(data));
      } else {
        const cached = await AsyncStorage.getItem(MISSIONS_CACHE_KEY);
        if (cached) setMissions(JSON.parse(cached));
      }

      const count = await syncService.getPendingCount();
      setPendingCount(count);
    } catch (err: any) {
      console.error('Failed to load missions:', err);
      if (err.message === 'AUTH_REQUIRED' || err.message?.includes('401')) {
        setError('Session expirée. Déconnexion...');
        logout();
      } else {
        setError('Impossible de charger les missions');
      }
      const cached = await AsyncStorage.getItem(MISSIONS_CACHE_KEY);
      if (cached) setMissions(JSON.parse(cached));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      loadMissions();
    }, [loadMissions])
  );

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online) loadMissions();
    });
    return unsub;
  }, [loadMissions]);

  // Synchroniser
  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Pas de connexion', 'Impossible de synchroniser sans réseau.');
      return;
    }

    setSyncing(true);
    try {
      const { synced, failed } = await syncService.forceSync();
      Alert.alert(
        'Synchronisation',
        `${synced} mission(s) synchronisée(s).${failed > 0 ? `\n⚠️ ${failed} échec(s)` : ''}`,
      );
      await loadMissions();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Badge "Délai dépassé" : mission in_progress depuis > 2h
  const isDelaiDepasse = (mission: Mission): boolean => {
    if (mission.statut !== 'in_progress') return false;
    const depuis = Date.now() - new Date(mission.dateCreation ?? 0).getTime();
    return depuis > 2 * 60 * 60 * 1000; // 2 heures
  };

  // Filtrer les missions (statut + texte)
  const filteredMissions = missions.filter((mission) => {
    if (filterStatut && mission.statut !== filterStatut) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      mission.numeroMission.toLowerCase().includes(searchLower) ||
      mission.destinationNom.toLowerCase().includes(searchLower) ||
      (mission.entrepotNom ?? '').toLowerCase().includes(searchLower)
    );
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header simple */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Missions</Text>
        <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#E8F5E9' : '#FFEBEE' }]}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]} />
          <Text style={[styles.statusText, { color: isOnline ? '#2E7D32' : '#D32F2F' }]}>
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </Text>
        </View>
      </View>

      {/* Recherche simple */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une mission..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#757575" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres rapides */}
      <View style={styles.filterRow}>
        {[
          { label: 'Toutes',    val: '' },
          { label: 'En attente', val: 'pending' },
          { label: 'En cours',  val: 'in_progress' },
          { label: 'Terminées', val: 'completed' },
        ].map(({ label, val }) => (
          <TouchableOpacity
            key={label}
            style={[styles.filterBtn, filterStatut === val && styles.filterBtnActive]}
            onPress={() => setFilterStatut(val)}
          >
            <Text style={[styles.filterBtnText, filterStatut === val && styles.filterBtnTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats simples */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{missions.filter(m => m.statut === 'pending').length}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{missions.filter(m => m.statut === 'in_progress').length}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{missions.filter(m => m.statut === 'completed').length}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
      </View>

      {/* Bouton sync si données en attente */}
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.syncButton} onPress={handleSync} disabled={syncing || !isOnline}>
          {syncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="sync" size={18} color="#fff" />
              <Text style={styles.syncButtonText}>
                Synchroniser ({pendingCount})
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Erreur */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#D32F2F" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Liste des missions */}
      <FlatList
        data={filteredMissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            {isDelaiDepasse(item) && (
              <View style={styles.delaiDepasseBadge}>
                <Ionicons name="warning" size={14} color="#fff" />
                <Text style={styles.delaiDepasseText}>Délai dépassé</Text>
              </View>
            )}
            <MissionCard
              mission={item}
              onPress={() => router.push({ pathname: '/mission-detail', params: { id: item.id } })}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadMissions(); }}
            colors={['#1565C0']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={48} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Aucune mission trouvée' : 'Aucune mission'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Essayez une autre recherche' : 'Les missions apparaîtront ici'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
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
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    color: '#757575',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#212121',
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },

  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#616161',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 4,
  },

  // Filtres rapides
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#757575',
  },
  filterBtnTextActive: {
    color: '#fff',
  },

  // Badge délai dépassé
  delaiDepasseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  delaiDepasseText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
