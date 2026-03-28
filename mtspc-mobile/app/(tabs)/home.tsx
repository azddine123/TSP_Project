/**
 * HOME SCREEN — Liste des Missions + Mode Hors-Ligne
 * ====================================================
 * Inspiré DIRECTEMENT de labcollect-mobile/app/(tabs)/home.tsx
 *
 * MÉCANISME HORS-LIGNE (à démontrer au jury) :
 * ─────────────────────────────────────────────
 * 1. Au chargement : NetInfo.fetch() vérifie la connectivité
 * 2. Si connecté   : charge les missions depuis le backend
 * 3. Si déconnecté : affiche les missions en cache (AsyncStorage)
 * 4. AsyncStorage.getItem('pending_submissions') → affiche le compteur
 * 5. Bouton ROUGE "Synchroniser (N)" → syncService.forceSync()
 *    → envoie les livraisons validées offline vers POST /sync du backend
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, FlatList, Text, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo      from '@react-native-community/netinfo';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { missionService } from '../services/missionService';
import { syncService }    from '../services/syncService';
import { Mission }        from '../types/app';
import MissionCard        from '../components/MissionCard';

const MISSIONS_CACHE_KEY = 'missions_cache';

type FilterStatut = 'all' | 'pending' | 'in_progress' | 'completed';

export default function HomeScreen() {
  const router = useRouter();

  const [missions,      setMissions]      = useState<Mission[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [isOnline,      setIsOnline]      = useState(true);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [syncing,       setSyncing]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState<FilterStatut>('all');

  // ── Chargement des missions ───────────────────────────────────────────────

  const loadMissions = useCallback(async () => {
    setError(null);
    try {
      // 1. Vérifier la connectivité (mécanisme clé du projet)
      const netState = await NetInfo.fetch();
      const online   = !!(netState.isConnected && netState.isInternetReachable);
      setIsOnline(online);

      if (online) {
        // 2a. En ligne → charger depuis l'API + mettre en cache
        const data = await missionService.getAllMissions();
        setMissions(data);
        await AsyncStorage.setItem(MISSIONS_CACHE_KEY, JSON.stringify(data));
      } else {
        // 2b. Hors ligne → charger depuis le cache local
        const cached = await AsyncStorage.getItem(MISSIONS_CACHE_KEY);
        if (cached) {
          setMissions(JSON.parse(cached));
        }
      }

      // 3. Compter les soumissions en attente de sync
      const count = await syncService.getPendingCount();
      setPendingCount(count);

    } catch (err) {
      setError('Impossible de charger les missions.');
      // En cas d'erreur réseau → charger le cache
      const cached = await AsyncStorage.getItem(MISSIONS_CACHE_KEY);
      if (cached) setMissions(JSON.parse(cached));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recharger à chaque focus de l'écran (retour de l'écran détail)
  useFocusEffect(
    useCallback(() => {
      loadMissions();
    }, [loadMissions]),
  );

  // Écouter les changements de connectivité en temps réel
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      // Si le réseau revient → recharger automatiquement
      if (online) loadMissions();
    });
    return unsub;
  }, [loadMissions]);

  // ── Synchronisation des livraisons hors-ligne ─────────────────────────────

  /**
   * handleSync() — Bouton rouge "Synchroniser (N missions)"
   * Réplique EXACTE du mécanisme de labcollect-mobile/app/(tabs)/home.tsx
   */
  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert(
        'Pas de connexion',
        'Impossible de synchroniser : aucun réseau détecté.\nRéessayez dès que vous serez en zone couverte.',
      );
      return;
    }

    setSyncing(true);
    try {
      const { synced, failed } = await syncService.forceSync();

      if (synced > 0) {
        Alert.alert(
          '✅ Synchronisation réussie',
          `${synced} mission(s) envoyée(s) au serveur.${
            failed > 0 ? `\n⚠️ ${failed} mission(s) en échec, elles seront réessayées.` : ''
          }`,
        );
        await loadMissions();
      } else if (failed > 0) {
        Alert.alert(
          '❌ Synchronisation échouée',
          'Impossible d\'envoyer les données. Vérifiez votre connexion et réessayez.',
        );
      } else {
        Alert.alert('ℹ️ Rien à synchroniser', 'Toutes les missions sont déjà à jour.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Filtrage et recherche ─────────────────────────────────────────────────

  const filteredMissions = missions.filter((m) => {
    const matchSearch =
      m.numeroMission.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.destinationNom.toLowerCase().includes(searchQuery.toLowerCase());

    const matchFilter =
      statusFilter === 'all' || m.statut === statusFilter;

    return matchSearch && matchFilter;
  });

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Chargement des missions…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Indicateur de connectivité ─────────────────────────── */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>
            Mode hors-ligne — Données en cache
          </Text>
        </View>
      )}

      {/* ── BOUTON SYNC ROUGE — Pièce maîtresse pour le jury ─────
          N'apparaît que si des livraisons attendent d'être envoyées.
          C'est la preuve concrète du mécanisme offline/sync. */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={syncing || !isOnline}
          activeOpacity={0.85}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="sync" size={20} color="#fff" />
          )}
          <Text style={styles.syncButtonText}>
            {syncing
              ? 'Synchronisation en cours…'
              : `Synchroniser (${pendingCount} mission${pendingCount > 1 ? 's' : ''})`
            }
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Barre de recherche ────────────────────────────────── */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une mission ou destination…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#bbb"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filtres par statut ────────────────────────────────── */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'in_progress', 'completed'] as FilterStatut[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[
              styles.filterChipText,
              statusFilter === f && styles.filterChipTextActive,
            ]}>
              {{ all: 'Toutes', pending: 'En attente', in_progress: 'En cours', completed: 'Terminées' }[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Message d'erreur ─────────────────────────────────── */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* ── FlatList des missions ─────────────────────────────── */}
      <FlatList
        data={filteredMissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MissionCard
            mission={item}
            onPress={() =>
              router.push({ pathname: '/mission-detail', params: { id: item.id } })
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadMissions(); }}
            colors={['#1565C0']}
            tintColor="#1565C0"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Aucune mission ne correspond à la recherche.'
                : 'Aucune mission assignée pour le moment.'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#F4F6F9',
  },
  centered: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    gap:            12,
  },
  loadingText: {
    color:    '#666',
    fontSize: 14,
  },

  // ── Bandeau hors-ligne ─────────────────────────────────────────
  offlineBanner: {
    backgroundColor: '#E53935',
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 8,
    gap:             6,
  },
  offlineBannerText: {
    color:      '#fff',
    fontSize:   13,
    fontWeight: '600',
  },

  // ── Bouton Sync ROUGE (pièce centrale du projet) ───────────────
  syncButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#E53935',
    marginHorizontal: 16,
    marginTop:        12,
    marginBottom:     4,
    paddingVertical:  13,
    borderRadius:     10,
    gap:              8,
    elevation:        4,
    shadowColor:     '#E53935',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.4,
    shadowRadius:    6,
  },
  syncButtonDisabled: {
    backgroundColor: '#EF9A9A',
    elevation:       0,
  },
  syncButtonText: {
    color:      '#fff',
    fontSize:   15,
    fontWeight: '700',
  },

  // ── Recherche ──────────────────────────────────────────────────
  searchBar: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop:        12,
    marginBottom:     8,
    paddingHorizontal: 12,
    paddingVertical:   10,
    borderRadius:     10,
    elevation:        2,
  },
  searchInput: {
    flex:     1,
    fontSize: 14,
    color:    '#333',
  },

  // ── Filtres ────────────────────────────────────────────────────
  filterRow: {
    flexDirection:   'row',
    paddingHorizontal: 16,
    marginBottom:    8,
    gap:             8,
    flexWrap:        'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical:    6,
    borderRadius:      20,
    backgroundColor:   '#E8EAF6',
  },
  filterChipActive: {
    backgroundColor: '#1565C0',
  },
  filterChipText: {
    fontSize:   12,
    color:      '#555',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  errorText: {
    color:          '#E53935',
    textAlign:      'center',
    marginVertical: 8,
    fontSize:       13,
  },

  emptyContainer: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     80,
    gap:            12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontSize:   15,
    color:      '#999',
    textAlign:  'center',
    lineHeight: 22,
  },
});
