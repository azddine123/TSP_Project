/**
 * RouteStepCard — Carte d'une étape dans l'itinéraire VRP
 * ========================================================
 * Affiche : numéro, douar, distance, ETA, priorité TOPSIS, articles.
 * Connecteur vertical pour l'effet "timeline".
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EtapeLivraison, PRIORITE_CONFIG } from '../types/tour';

interface Props {
  etape:     EtapeLivraison;
  index:     number;
  isLast:    boolean;
  onPress:   () => void;
}

export function RouteStepCard({ etape, index, isLast, onPress }: Props) {
  const cfg  = PRIORITE_CONFIG[etape.priorite] ?? PRIORITE_CONFIG.MEDIUM;
  const done = etape.statut !== 'pending';

  const statusIcon =
    etape.statut === 'delivered' ? 'checkmark-circle'  :
    etape.statut === 'partial'   ? 'alert-circle'       :
    etape.statut === 'skipped'   ? 'close-circle'       :
    null;

  const statusColor =
    etape.statut === 'delivered' ? '#16A34A' :
    etape.statut === 'partial'   ? '#D97706' :
    etape.statut === 'skipped'   ? '#6B7280' :
    undefined;

  return (
    <TouchableOpacity
      style={[styles.row, done && styles.rowDone]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* ── Connecteur vertical (timeline) ─────────────────────── */}
      <View style={styles.connector}>
        <View style={[styles.badge, { backgroundColor: done ? '#CBD5E1' : cfg.color }]}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>
        {!isLast && <View style={styles.line} />}
      </View>

      {/* ── Contenu ─────────────────────────────────────────────── */}
      <View style={[styles.card, { borderLeftColor: done ? '#CBD5E1' : cfg.color }]}>

        {/* En-tête : nom + badge priorité */}
        <View style={styles.cardHeader}>
          <Text style={[styles.douarNom, done && styles.douarNomDone]} numberOfLines={1}>
            {etape.douarNom}
          </Text>
          <View style={[styles.prioriteBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.prioriteText, { color: cfg.color }]}>
              {cfg.emoji} {cfg.label}
            </Text>
          </View>
        </View>

        {/* Méta : distance, ETA, score TOPSIS */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={12} color="#94A3B8" />
            <Text style={styles.metaText}>{etape.distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="#94A3B8" />
            <Text style={styles.metaText}>{etape.etaMinutes} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="stats-chart-outline" size={12} color="#94A3B8" />
            <Text style={styles.metaText}>
              TOPSIS {(etape.topsisScore * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Articles planifiés (3 max + overflow) */}
        <View style={styles.articles}>
          {etape.articlesPlanifies.slice(0, 3).map((a) => (
            <View key={a.item} style={styles.articleChip}>
              <Text style={styles.articleChipText}>{a.quantite}× {a.item}</Text>
            </View>
          ))}
          {etape.articlesPlanifies.length > 3 && (
            <View style={styles.articleChip}>
              <Text style={styles.articleChipText}>
                +{etape.articlesPlanifies.length - 3}
              </Text>
            </View>
          )}
        </View>

        {/* Statut (si confirmé) */}
        {done && statusIcon && (
          <View style={styles.statusRow}>
            <Ionicons name={statusIcon as any} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {etape.statut === 'delivered' ? 'Livré'   :
               etape.statut === 'partial'   ? 'Partiel' : 'Ignoré'}
              {etape.isSynced ? '' : ' (non synchronisé)'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row:         { flexDirection: 'row', marginBottom: 6 },
  rowDone:     { opacity: 0.55 },

  connector:   { alignItems: 'center', marginRight: 10, width: 30 },
  badge: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  line:        { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 2 },

  card: {
    flex:           1,
    backgroundColor: '#fff',
    borderRadius:   12,
    padding:        12,
    borderLeftWidth: 3,
    elevation:       2,
    shadowColor:    '#000',
    shadowOpacity:  0.06,
    shadowRadius:   4,
    shadowOffset:   { width: 0, height: 1 },
  },

  cardHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  douarNom:     { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
  douarNomDone: { color: '#94A3B8' },

  prioriteBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  prioriteText:  { fontSize: 11, fontWeight: '700' },

  meta:         { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:     { fontSize: 11, color: '#94A3B8' },

  articles:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  articleChip:  {
    backgroundColor: '#EFF6FF',
    borderRadius:    6,
    paddingHorizontal: 7,
    paddingVertical:   3,
  },
  articleChipText: { fontSize: 11, color: '#3B82F6', fontWeight: '500' },

  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  statusText:   { fontSize: 12, fontWeight: '600' },
});
