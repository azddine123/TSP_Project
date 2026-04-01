/**
 * OfflineBanner — Bandeau animé mode hors-ligne
 * ==============================================
 * Glisse depuis le haut dès que la connexion est perdue.
 * Disparaît automatiquement au retour du réseau.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  isOnline:     boolean;
  isSyncing?:   boolean;
  pendingCount?: number;
}

export function OfflineBanner({ isOnline, isSyncing = false, pendingCount = 0 }: Props) {
  const translateY = useRef(new Animated.Value(-52)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue:         isOnline ? -52 : 0,
      useNativeDriver: true,
      tension:         80,
      friction:        12,
    }).start();
  }, [isOnline, translateY]);

  const message = isSyncing
    ? 'Synchronisation en cours…'
    : pendingCount > 0
    ? `Mode hors-ligne — ${pendingCount} opération${pendingCount > 1 ? 's' : ''} en attente`
    : 'Mode hors-ligne — données sauvegardées localement';

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Ionicons
        name={isSyncing ? 'sync' : 'cloud-offline'}
        size={15}
        color="#fff"
      />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    zIndex:          999,
    backgroundColor: '#E65100',
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 10,
    gap:             7,
    elevation:       8,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    4,
  },
  text: {
    color:      '#fff',
    fontSize:   13,
    fontWeight: '600',
  },
});
