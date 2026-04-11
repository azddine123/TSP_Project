/**
 * MAP VIEW WRAPPER
 * ================
 * Composant qui gère la compatibilité cross-platform pour la carte.
 * - Mobile (iOS/Android) : utilise react-native-maps
 * - Web : affiche une simulation/mock de carte
 */
import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';

// Export des types pour compatibilité
export interface MarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
  pinColor?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  key?: string | number;
}

export interface PolylineProps {
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
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
  // Pour compatibilité ref
  ref?: React.Ref<any>;
}

// Constantes pour compatibilité
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION WEB (Mock)
// ═══════════════════════════════════════════════════════════════════════════════

const WebMapView: React.FC<MapViewProps> = ({ 
  style, 
  initialRegion, 
  region, 
  children,
  showsUserLocation 
}) => {
  const activeRegion = region || initialRegion;
  
  return (
    <View style={[styles.webContainer, style]}>
      <View style={styles.webMapPlaceholder}>
        <Text style={styles.webMapTitle}>🗺️ Carte non disponible sur Web</Text>
        <Text style={styles.webMapSubtitle}>
          {activeRegion 
            ? `Position: ${activeRegion.latitude.toFixed(4)}, ${activeRegion.longitude.toFixed(4)}`
            : 'Aucune région définie'}
        </Text>
        {showsUserLocation && (
          <View style={styles.webUserLocation}>
            <Text style={styles.webUserLocationText}>📍 Position utilisateur</Text>
          </View>
        )}
        <View style={styles.webNote}>
          <Text style={styles.webNoteText}>
            Utilisez l'application mobile pour voir la carte interactive
          </Text>
        </View>
      </View>
      
      {/* Rendre les children (Marker/Polyline) en mode simulation */}
      <View style={styles.webOverlay} pointerEvents="none">
        {children}
      </View>
    </View>
  );
};

const WebMarker: React.FC<MarkerProps> = ({ coordinate, title, pinColor }) => (
  <View style={styles.webMarkerContainer}>
    <View style={[styles.webMarker, { backgroundColor: pinColor || '#1565C0' }]}>
      <Text style={styles.webMarkerText}>📍</Text>
    </View>
    {title && <Text style={styles.webMarkerTitle}>{title}</Text>}
  </View>
);

const WebPolyline: React.FC<PolylineProps> = ({ coordinates, strokeColor }) => (
  <View style={styles.webPolylineContainer}>
    <Text style={styles.webPolylineText}>
      ➡️ Itinéraire ({coordinates?.length || 0} points)
    </Text>
    <View style={[styles.webPolylineLine, { backgroundColor: strokeColor || '#1565C0' }]} />
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION MOBILE (React Native Maps)
// ═══════════════════════════════════════════════════════════════════════════════

let MobileMapView: any = View;
let MobileMarker: any = View;
let MobilePolyline: any = View;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MobileMapView = Maps.default;
    MobileMarker = Maps.Marker;
    MobilePolyline = Maps.Polyline;
  } catch (e) {
    console.warn('react-native-maps not available');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const MapView: React.FC<MapViewProps> = Platform.OS === 'web' ? WebMapView : MobileMapView;
export const Marker: React.FC<MarkerProps> = Platform.OS === 'web' ? WebMarker : MobileMarker;
export const Polyline: React.FC<PolylineProps> = Platform.OS === 'web' ? WebPolyline : MobilePolyline;
export type { MapRegion as Region };

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  webContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  webMapPlaceholder: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#1565C0',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  webMapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  webMapSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  webUserLocation: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  webUserLocationText: {
    color: '#fff',
    fontWeight: '600',
  },
  webNote: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    maxWidth: 300,
  },
  webNoteText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
  },
  webOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  webMarkerContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  webMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  webMarkerText: {
    fontSize: 16,
  },
  webMarkerTitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  webPolylineContainer: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    margin: 4,
  },
  webPolylineText: {
    fontSize: 12,
    color: '#333',
  },
  webPolylineLine: {
    height: 3,
    marginTop: 4,
    borderRadius: 2,
  },
});
