/**
 * RoutePolyline Component
 * Renders route polyline - stub for WebView-based MapView
 * The actual polyline rendering is handled inside MapView WebView
 */

import React, {memo} from 'react';
import {RouteResponse} from '../../types/models';

export interface RoutePolylineProps {
  route: RouteResponse;
  showRiskColors?: boolean;
  strokeWidth?: number;
  opacity?: number;
  isAlternative?: boolean;
  onPress?: () => void;
}

/**
 * Decode Google polyline encoded string to coordinates
 */
export const decodePolyline = (encoded: string | undefined | null): {latitude: number; longitude: number}[] => {
  if (!encoded || typeof encoded !== 'string' || encoded.length === 0) {
    return [];
  }

  const coordinates: {latitude: number; longitude: number}[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  try {
    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);

      const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);

      const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
  } catch (e) {
    console.warn('Error decoding polyline:', e);
    return [];
  }

  return coordinates;
};

/**
 * RoutePolyline Component - Stub
 * Actual rendering is done in MapView WebView
 */
const RoutePolylineComponent: React.FC<RoutePolylineProps> = () => {
  // This component doesn't render anything directly
  // The MapView WebView handles polyline rendering
  return null;
};

export const RoutePolyline = memo(RoutePolylineComponent);
RoutePolyline.displayName = 'RoutePolyline';

export default RoutePolyline;
