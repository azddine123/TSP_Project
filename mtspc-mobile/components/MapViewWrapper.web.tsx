/**
 * MAP VIEW WRAPPER — Version WEB
 * ================================
 * Ce fichier est chargé UNIQUEMENT sur web (extension .web.tsx).
 * react-native-maps n'est jamais importé ici → pas d'erreur "native-only module".
 *
 * Sur iOS/Android, Metro charge MapViewWrapper.tsx à la place.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ── Types réexportés pour compatibilité avec les écrans ──────────────────────

export interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  key?: string | number;
}

export interface PolylineProps {
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  lineDashPattern?: number[];
}

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export interface MapViewProps {
  style?: any;
  initialRegion?: MapRegion;
  region?: MapRegion;
  provider?: any;
  children?: React.ReactNode;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  onPress?: (e: any) => void;
  ref?: React.Ref<any>;
}

export type { MapRegion as Region };

// Constantes de compatibilité
export const PROVIDER_GOOGLE   = 'google' as const;
export const PROVIDER_DEFAULT  = undefined;

// ── Composants web ───────────────────────────────────────────────────────────

export const MapView: React.FC<MapViewProps> = ({ style, initialRegion, region, children }) => {
  const activeRegion = region ?? initialRegion;
  return (
    <View style={[styles.container, style]}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>🗺️ Carte non disponible sur Web</Text>
        {activeRegion && (
          <Text style={styles.subtitle}>
            {activeRegion.latitude.toFixed(4)}, {activeRegion.longitude.toFixed(4)}
          </Text>
        )}
        <Text style={styles.note}>Utilisez l'application mobile pour la carte interactive</Text>
      </View>
      {children}
    </View>
  );
};

export const Marker: React.FC<MarkerProps> = ({ title, pinColor }) => (
  <View style={[styles.markerDot, { backgroundColor: pinColor ?? '#1565C0' }]}>
    {title ? <Text style={styles.markerLabel}>{title}</Text> : null}
  </View>
);

export const Polyline: React.FC<PolylineProps> = ({ coordinates, strokeColor }) => (
  <View style={[styles.polylineLine, { backgroundColor: strokeColor ?? '#1565C0' }]}>
    <Text style={styles.polylineText}>
      ➡ Itinéraire ({coordinates?.length ?? 0} points)
    </Text>
  </View>
);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#1565C0',
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1565C0' },
  subtitle: { fontSize: 13, color: '#555' },
  note: { fontSize: 12, color: '#E65100', textAlign: 'center', marginTop: 8 },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    margin: 4,
  },
  markerLabel: { fontSize: 10, color: '#333', marginTop: 2 },
  polylineLine: {
    height: 3,
    borderRadius: 2,
    margin: 4,
  },
  polylineText: { fontSize: 11, color: '#555', marginBottom: 2 },
});
