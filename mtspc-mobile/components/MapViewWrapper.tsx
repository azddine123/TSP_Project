/**
 * MAP VIEW WRAPPER — Version NATIVE (iOS / Android)
 * ===================================================
 * Ce fichier est chargé sur iOS et Android.
 * Sur web, Metro charge MapViewWrapper.web.tsx à la place (extension .web.tsx
 * prioritaire) → react-native-maps n'est jamais bundlé pour le web.
 */
import RNMapView, {
  Marker as RNMarker,
  Polyline as RNPolyline,
  PROVIDER_GOOGLE as RN_PROVIDER_GOOGLE,
} from 'react-native-maps';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Exports ──────────────────────────────────────────────────────────────────

export const MapView     = RNMapView  as unknown as React.FC<MapViewProps>;
export const Marker      = RNMarker   as unknown as React.FC<MarkerProps>;
export const Polyline    = RNPolyline as unknown as React.FC<PolylineProps>;

export const PROVIDER_GOOGLE  = RN_PROVIDER_GOOGLE;
export const PROVIDER_DEFAULT = undefined;
