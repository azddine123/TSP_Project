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

  // Filtrer les missions
  const filteredMissions = missions.filter((mission) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      mission.numeroMission.toLowerCase().includes(searchLower) ||
      mission.destinationNom.toLowerCase().includes(searchLower) ||
      mission.entrepotNom.toLowerCase().includes(searchLower)
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
          <MissionCard
            mission={item}
            onPress={() => router.push({ pathname: '/mission-detail', params: { id: item.id } })}
          />
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
});
