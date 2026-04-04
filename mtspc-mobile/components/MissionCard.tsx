/**
 * MISSION CARD — Style LabCollect adapté pour NAJDA
 * ==================================================
 * Carte résumant une mission avec informations détaillées:
 * - Code géographique du douar (HCP)
 * - Date d'affectation
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Mission } from '../types/app';
import { formatCodeGeo, formatDateAffectation, MissionMock } from '../mock/missions';

// Couleurs par statut
const STATUT_CONFIG: Record<string, { color: string; label: string; bgColor: string }> = {
  draft:       { color: '#9E9E9E', label: 'Brouillon',  bgColor: '#F5F5F5' },
  pending:     { color: '#FF9800', label: 'En attente', bgColor: '#FFF3E0' },
  in_progress: { color: '#2196F3', label: 'En cours',   bgColor: '#E3F2FD' },
  completed:   { color: '#4CAF50', label: 'Terminée',   bgColor: '#E8F5E8' },
  annulee:     { color: '#F44336', label: 'Annulée',    bgColor: '#FFEBEE' },
};

// Couleurs par priorité
const PRIORITE_CONFIG: Record<string, { color: string; label: string }> = {
  low:      { color: '#9E9E9E', label: 'Basse' },
  medium:   { color: '#FF9800', label: 'Normale' },
  high:     { color: '#F44336', label: 'Haute' },
  critique: { color: '#B71C1C', label: 'Critique' },
};

interface Props {
  mission: Mission | MissionMock;
  onPress: () => void;
}

export default function MissionCard({ mission, onPress }: Props) {
  const statutCfg = STATUT_CONFIG[mission.statut] || STATUT_CONFIG.pending;
  const prioriteCfg = PRIORITE_CONFIG[mission.priorite] || PRIORITE_CONFIG.medium;

  // Vérifier si c'est une mission mockée (avec données HCP étendues)
  const isMockMission = 'douarInfo' in mission;
  const mockMission = isMockMission ? (mission as MissionMock) : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Déterminer le texte du bouton d'action
  const getActionButton = () => {
    switch (mission.statut) {
      case 'completed':
        return (
          <View style={[styles.actionButton, { backgroundColor: '#E8F5E8' }]}>
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            <Text style={[styles.actionText, { color: '#4CAF50' }]}>Terminée</Text>
          </View>
        );
      case 'in_progress':
        return (
          <View style={[styles.actionButton, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="play-circle" size={18} color="#FF9800" />
            <Text style={[styles.actionText, { color: '#FF9800' }]}>Continuer</Text>
          </View>
        );
      case 'draft':
        return (
          <View style={[styles.actionButton, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="create" size={18} color="#9C27B0" />
            <Text style={[styles.actionText, { color: '#9C27B0' }]}>Modifier</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.actionButton, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="arrow-forward" size={18} color="#2196F3" />
            <Text style={[styles.actionText, { color: '#2196F3' }]}>Démarrer</Text>
          </View>
        );
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* En-tête avec numéro de mission et statut */}
      <View style={styles.header}>
        <View style={styles.missionNumberContainer}>
          <Ionicons name="document-text" size={16} color="#1565C0" />
          <Text style={styles.missionNumber}>{mission.numeroMission}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statutCfg.bgColor }]}>
          <Text style={[styles.statusText, { color: statutCfg.color }]}>
            {statutCfg.label}
          </Text>
        </View>
      </View>

      {/* Code géographique du douar (si disponible) */}
      {mockMission?.douarInfo && (
        <View style={styles.codeGeoContainer}>
          <Ionicons name="barcode" size={14} color="#1565C0" />
          <Text style={styles.codeGeoText}>
            Code géo: {formatCodeGeo(mockMission.douarInfo.codeGeo)}
          </Text>
        </View>
      )}

      {/* Destination */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color="#666" />
          <Text style={styles.destination} numberOfLines={1}>
            {mockMission?.douarInfo 
              ? `${mockMission.douarInfo.douar}, ${mockMission.douarInfo.commune}` 
              : mission.destinationNom}
          </Text>
        </View>
        {mockMission?.douarInfo && (
          <Text style={styles.locationDetail}>
            {mockMission.douarInfo.province}, {mockMission.douarInfo.region}
          </Text>
        )}
      </View>

      {/* Détails de la mission */}
      <View style={styles.detailsRow}>
        {/* Priorité */}
        <View style={styles.detailItem}>
          <Ionicons 
            name="flag" 
            size={14} 
            color={prioriteCfg.color} 
          />
          <Text style={[styles.detailText, { color: prioriteCfg.color }]}>
            {prioriteCfg.label}
          </Text>
        </View>

        {/* Date d'affectation */}
        {mockMission?.dateAffectation && (
          <View style={styles.detailItem}>
            <Ionicons name="person-add" size={14} color="#666" />
            <Text style={styles.detailText}>
              Affectée: {formatDateAffectation(mockMission.dateAffectation)}
            </Text>
          </View>
        )}

        {/* Date d'échéance */}
        <View style={styles.detailItem}>
          <Ionicons name="calendar" size={14} color="#666" />
          <Text style={styles.detailText}>
            Échéance: {formatDate(mission.dateEcheance)}
          </Text>
        </View>
      </View>

      {/* Entrepôt et action */}
      <View style={styles.footer}>
        <View style={styles.entrepotContainer}>
          <Ionicons name="business" size={14} color="#888" />
          <Text style={styles.entrepotText} numberOfLines={1}>
            {mission.entrepotNom}
          </Text>
        </View>
        {getActionButton()}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  missionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  codeGeoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  codeGeoText: {
    fontSize: 12,
    color: '#1565C0',
    marginLeft: 6,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  section: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destination: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  locationDetail: {
    fontSize: 13,
    color: '#666',
    marginLeft: 26,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  entrepotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  entrepotText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
