/**
 * MISSION CARD — Carte résumant une mission dans la FlatList
 * Adapté depuis labcollect-mobile/app/components/MissionCard.tsx
 * sampleCount → inventaire logistique (tentes, médicaments, eau)
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Mission } from '../types/app';

// Couleurs par statut — synchronisées avec le dashboard web
const STATUT_CONFIG: Record<string, { color: string; label: string }> = {
  draft:       { color: '#9E9E9E', label: 'Brouillon'  },
  pending:     { color: '#FF9800', label: 'En attente' },
  in_progress: { color: '#2196F3', label: 'En cours'   },
  completed:   { color: '#4CAF50', label: 'Terminée'   },
  annulee:     { color: '#F44336', label: 'Annulée'    },
};

const PRIORITE_CONFIG: Record<string, { color: string }> = {
  low:      { color: '#9E9E9E' },
  medium:   { color: '#FF9800' },
  high:     { color: '#F44336' },
  critique: { color: '#B71C1C' },
};

interface Props {
  mission:  Mission;
  onPress:  () => void;
}

export default function MissionCard({ mission, onPress }: Props) {
  const statutCfg  = STATUT_CONFIG[mission.statut]  || STATUT_CONFIG.pending;
  const prioriteCfg = PRIORITE_CONFIG[mission.priorite] || PRIORITE_CONFIG.medium;

  const echeance = new Date(mission.dateEcheance).toLocaleDateString('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Bande de priorité à gauche */}
      <View style={[styles.priorityBar, { backgroundColor: prioriteCfg.color }]} />

      <View style={styles.content}>
        {/* En-tête : numéro + statut */}
        <View style={styles.row}>
          <Text style={styles.missionNum}>{mission.numeroMission}</Text>
          <View style={[styles.statutBadge, { backgroundColor: statutCfg.color + '22' }]}>
            <Text style={[styles.statutText, { color: statutCfg.color }]}>
              {statutCfg.label.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Destination */}
        <Text style={styles.destination} numberOfLines={1}>
          📍 {mission.destinationNom}
        </Text>

        {/* Inventaire logistique (remplace sampleCount de labcollect) */}
        <View style={styles.inventoryRow}>
          {mission.tentes > 0 && (
            <View style={styles.inventoryChip}>
              <Text style={styles.inventoryText}>⛺ {mission.tentes}</Text>
            </View>
          )}
          {mission.eau > 0 && (
            <View style={[styles.inventoryChip, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.inventoryText, { color: '#1565C0' }]}>
                💧 {mission.eau}
              </Text>
            </View>
          )}
          {mission.medicaments > 0 && (
            <View style={[styles.inventoryChip, { backgroundColor: '#FCE4EC' }]}>
              <Text style={[styles.inventoryText, { color: '#C62828' }]}>
                💊 {mission.medicaments}
              </Text>
            </View>
          )}
        </View>

        {/* Pied : entrepôt + échéance */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🏭 {mission.entrepotNom}</Text>
          <Text style={styles.footerText}>📅 {echeance}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    backgroundColor: '#fff',
    borderRadius:    12,
    marginHorizontal: 16,
    marginVertical:   6,
    elevation:        3,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.1,
    shadowRadius:    4,
    overflow:        'hidden',
  },
  priorityBar: {
    width:  5,
    borderTopLeftRadius:    12,
    borderBottomLeftRadius: 12,
  },
  content: {
    flex:    1,
    padding: 14,
    gap:     6,
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  missionNum: {
    fontSize:   15,
    fontWeight: '700',
    color:      '#1A237E',
    fontFamily: 'monospace',
  },
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      20,
  },
  statutText: {
    fontSize:   10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  destination: {
    fontSize: 14,
    color:    '#333',
    fontWeight: '500',
  },
  inventoryRow: {
    flexDirection: 'row',
    gap:           8,
    flexWrap:      'wrap',
  },
  inventoryChip: {
    backgroundColor:  '#F3E5F5',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      20,
  },
  inventoryText: {
    fontSize:   12,
    fontWeight: '600',
    color:      '#6A1B9A',
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginTop:       4,
  },
  footerText: {
    fontSize: 12,
    color:    '#888',
  },
});
