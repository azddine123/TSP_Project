/**
 * HOME SCREEN — Dashboard Opérationnel Style LabCollect
 * ======================================================
 * Inspiré de labcollect-mobile/app/(tabs)/home.tsx
 * Liste des missions avec recherche, filtres et actions rapides.
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
import { missionService, USE_MOCK_DATA } from '../../services/missionService';
import { syncService } from '../../services/syncService';
import { Mission } from '../../types/app';
import { useAuth } from '../../contexts/AuthContext';

type SortOption = 'dueDate' | 'priority' | 'missionNumber';
type FilterOption = 'all' | 'pending' | 'in_progress' | 'completed';

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
  const [syncing, setSyncing] = useState(false);
  
  // Filtres et tri
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Charger les missions
  const loadMissions = useCallback(async () => {
    try {
      setError(null);
      
      // Vérifier la connexion réseau
      const netInfo = await NetInfo.fetch();
      const online = !!(netInfo.isConnected && netInfo.isInternetReachable);
      setIsOnline(online);
      
      if (online) {
        // En ligne → charger depuis l'API
        const data = await missionService.getAllMissions();
        setMissions(data);
        await AsyncStorage.setItem(MISSIONS_CACHE_KEY, JSON.stringify(data));
      } else {
        // Hors ligne → charger depuis le cache
        const cached = await AsyncStorage.getItem(MISSIONS_CACHE_KEY);
        if (cached) {
          setMissions(JSON.parse(cached));
        }
      }
      
      // Compter les soumissions en attente
      const count = await syncService.getPendingCount();
      setPendingCount(count);
    } catch (err: any) {
      console.error('Failed to load missions:', err);
      
      // Gérer l'erreur d'authentification
      if (err.message === 'AUTH_REQUIRED' || err.message?.includes('401')) {
        if (USE_MOCK_DATA) {
          // En mode mock, ne pas rediriger vers login
          setError('Mode démo: Les données sont chargées localement.');
        } else {
          setError('Session expirée. Déconnexion...');
          // Déconnexion - le RootLayout redirigera automatiquement vers login
          logout();
        }
      } else {
        setError('Impossible de charger les missions. Veuillez réessayer.');
      }
      
      // En cas d'erreur → charger le cache
      const cached = await AsyncStorage.getItem(MISSIONS_CACHE_KEY);
      if (cached) setMissions(JSON.parse(cached));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  // Charger à l'ouverture
  useFocusEffect(
    useCallback(() => {
      loadMissions();
    }, [loadMissions])
  );

  // Écouter les changements de connectivité
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
      Alert.alert(
        'Pas de connexion',
        'Impossible de synchroniser : aucun réseau détecté.',
      );
      return;
    }

    setSyncing(true);
    try {
      const { synced, failed } = await syncService.forceSync();

      if (synced > 0) {
        Alert.alert(
          'Synchronisation réussie',
          `${synced} mission(s) synchronisée(s).${failed > 0 ? `\\n⚠️ ${failed} échec(s)` : ''}`,
        );
        await loadMissions();
      } else if (failed > 0) {
        Alert.alert('Synchronisation échouée', 'Impossible d\'envoyer les données.');
      } else {
        Alert.alert('Info', 'Rien à synchroniser.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Trier les missions
  const sortMissions = (missionsToSort: Mission[]) => {
    return [...missionsToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
          break;
        case 'priority':
          const priorityValues: Record<string, number> = { 
            critique: 4, high: 3, medium: 2, low: 1 
          };
          comparison = (priorityValues[a.priorite] || 0) - (priorityValues[b.priorite] || 0);
          break;
        case 'missionNumber':
          comparison = a.numeroMission.localeCompare(b.numeroMission);
          break;
      }
      
      return sortAsc ? comparison : -comparison;
    });
  };

  // Filtrer les missions
  const filterMissions = (missionsToFilter: Mission[]) => {
    return missionsToFilter.filter(mission => {
      if (statusFilter !== 'all' && mission.statut !== statusFilter) {
        return false;
      }
      
      const searchLower = searchQuery.toLowerCase();
      return (
        mission.numeroMission.toLowerCase().includes(searchLower) ||
        mission.destinationNom.toLowerCase().includes(searchLower) ||
        mission.entrepotNom.toLowerCase().includes(searchLower)
      );
    });
  };

  const filteredAndSortedMissions = sortMissions(filterMissions(missions));

  const toggleSortOrder = () => {
    setSortAsc(!sortAsc);
  };

  const changeSortOption = (option: SortOption) => {
    if (sortBy === option) {
      toggleSortOrder();
    } else {
      setSortBy(option);
      setSortAsc(true);
    }
  };

  const handleOpenMission = (mission: Mission) => {
    router.push({ pathname: '/mission-detail', params: { id: mission.id } });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Chargement des missions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Missions assignées</Text>
          {USE_MOCK_DATA && (
            <View style={styles.demoBadge}>
              <Ionicons name="flask" size={12} color="#fff" />
              <Text style={styles.demoText}>MODE DÉMO</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.newMissionButton}
            onPress={() => router.push('/new-mission' as any)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newMissionButtonText}>Nouvelle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une mission..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilterMenu(!showFilterMenu)}
        >
          <Ionicons name="options" size={20} color="#1565C0" />
        </TouchableOpacity>
      </View>

      {/* Menu de filtrage */}
      {showFilterMenu && (
        <View style={styles.filterMenu}>
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Filtrer par statut:</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'all', label: 'Tous' },
                { key: 'pending', label: 'En attente' },
                { key: 'in_progress', label: 'En cours' },
                { key: 'completed', label: 'Terminé' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.filterOption,
                    statusFilter === item.key && styles.filterOptionActive
                  ]}
                  onPress={() => setStatusFilter(item.key as FilterOption)}
                >
                  <Text style={statusFilter === item.key ? styles.filterTextActive : styles.filterText}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Trier par:</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'dueDate', label: 'Date d\'échéance' },
                { key: 'priority', label: 'Priorité' },
                { key: 'missionNumber', label: 'N° de mission' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.filterOption,
                    sortBy === item.key && styles.filterOptionActive
                  ]}
                  onPress={() => changeSortOption(item.key as SortOption)}
                >
                  <Text style={sortBy === item.key ? styles.filterTextActive : styles.filterText}>
                    {item.label} {sortBy === item.key && (sortAsc ? '↑' : '↓')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Bouton de synchronisation */}
      {pendingCount > 0 && (
        <TouchableOpacity 
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]} 
          onPress={handleSync}
          disabled={syncing || !isOnline}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="sync" size={20} color="#fff" />
          )}
          <Text style={styles.syncButtonText}>
            {syncing ? 'Synchronisation...' : `Synchroniser (${pendingCount})`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Message d'erreur */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Indicateur hors-ligne */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>Mode hors-ligne</Text>
        </View>
      )}

      {/* Liste des missions */}
      <FlatList
        data={filteredAndSortedMissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MissionCard mission={item} onPress={() => handleOpenMission(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMissions(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Aucune mission ne correspond à vos critères.'
                : 'Aucune mission assignée.'}
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  demoText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newMissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565C0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  newMissionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    padding: 4,
    marginLeft: 8,
  },
  filterMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#1565C0',
  },
  filterText: {
    fontSize: 14,
    color: '#555',
  },
  filterTextActive: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  syncButtonDisabled: {
    backgroundColor: '#EF9A9A',
    elevation: 0,
  },
  syncButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 15,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#F44336',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  offlineBanner: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
