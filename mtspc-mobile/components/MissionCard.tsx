/**
 * MISSION CARD - Carte de mission simplifiée
 * ==========================================
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Mission } from '../types/app';

interface MissionCardProps {
  mission: Mission;
  onPress: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  annulee: 'Annulée',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#F5F5F5', text: '#616161' },
  pending: { bg: '#FFF3E0', text: '#E65100' },
  in_progress: { bg: '#E3F2FD', text: '#1565C0' },
  completed: { bg: '#E8F5E9', text: '#2E7D32' },
  annulee: { bg: '#FFEBEE', text: '#C62828' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#757575',
  medium: '#F57C00',
  high: '#D32F2F',
  critique: '#B71C1C',
};

export default function MissionCard({ mission, onPress }: MissionCardProps) {
  const statusStyle = STATUS_COLORS[mission.statut] || STATUS_COLORS.draft;
  const priorityColor = PRIORITY_COLORS[mission.priorite] || PRIORITY_COLORS.low;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.missionNumber}>{mission.numeroMission}</Text>
          <Text style={styles.destination}>{mission.destinationNom}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {STATUS_LABELS[mission.statut] || mission.statut}
          </Text>
        </View>
      </View>

      {/* Info ligne */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="business-outline" size={16} color="#757575" />
          <Text style={styles.infoText}>{mission.entrepotNom}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={16} color="#757575" />
          <Text style={styles.infoText}>
            {new Date(mission.dateEcheance).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </View>

      {/* Footer avec priorité et items */}
      <View style={styles.footer}>
        <View style={styles.priorityContainer}>
          <Ionicons name="flag" size={14} color={priorityColor} />
          <Text style={[styles.priorityText, { color: priorityColor }]}>
            {mission.priorite.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.itemsCount}>
          {mission.items?.length || 0} article(s)
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  missionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 2,
  },
  destination: {
    fontSize: 14,
    color: '#212121',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#616161',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemsCount: {
    fontSize: 12,
    color: '#9E9E9E',
  },
});
