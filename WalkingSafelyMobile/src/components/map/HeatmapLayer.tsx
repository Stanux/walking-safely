/**
 * HeatmapLayer Component
 * Renders heatmap overlay showing crime concentration
 * Requirements: 9.2, 9.3, 15.1, 15.2
 */

import React, {useMemo, memo} from 'react';
import {Circle, Heatmap} from 'react-native-maps';
import {Platform} from 'react-native';
import {HeatmapPoint} from '../../types/models';
import {colors} from '../../theme/colors';
import {arrayEqual} from '../../utils/performance';

/**
 * Props for HeatmapLayer component
 */
export interface HeatmapLayerProps {
  /** Array of heatmap data points */
  points: HeatmapPoint[];
  /** Whether the heatmap is visible */
  visible?: boolean;
  /** Radius of each heatmap point (in meters) */
  radius?: number;
  /** Opacity of the heatmap layer */
  opacity?: number;
  /** Gradient colors for heatmap (low to high) */
  gradient?: {
    colors: string[];
    startPoints: number[];
    colorMapSize: number;
  };
}

/**
 * Default heatmap gradient (green -> yellow -> red)
 */
const DEFAULT_GRADIENT = {
  colors: [
    'rgba(34, 197, 94, 0)', // Transparent green
    'rgba(34, 197, 94, 0.4)', // Low risk - green
    'rgba(234, 179, 8, 0.6)', // Medium risk - yellow
    'rgba(239, 68, 68, 0.8)', // High risk - red
    'rgba(185, 28, 28, 1)', // Critical - dark red
  ],
  startPoints: [0, 0.2, 0.5, 0.8, 1],
  colorMapSize: 256,
};

/**
 * Default radius for heatmap points (meters)
 */
const DEFAULT_RADIUS = 50;

/**
 * Default opacity
 */
const DEFAULT_OPACITY = 0.7;

/**
 * Convert HeatmapPoint to weighted location format
 */
interface WeightedLocation {
  latitude: number;
  longitude: number;
  weight: number;
}

/**
 * Get color based on weight for circle fallback
 */
const getCircleColor = (weight: number): string => {
  if (weight < 0.3) {
    return colors.map.heatmapLow;
  }
  if (weight < 0.7) {
    return colors.map.heatmapMedium;
  }
  return colors.map.heatmapHigh;
};

/**
 * HeatmapLayer Component
 * Renders a heatmap visualization of crime data on the map
 *
 * Note: react-native-maps Heatmap is only available on iOS with Google Maps
 * and Android. For iOS with Apple Maps, we fall back to circles.
 */
const HeatmapLayerComponent: React.FC<HeatmapLayerProps> = ({
  points,
  visible = true,
  radius = DEFAULT_RADIUS,
  opacity = DEFAULT_OPACITY,
  gradient = DEFAULT_GRADIENT,
}) => {
  /**
   * Convert points to weighted locations
   */
  const weightedLocations: WeightedLocation[] = useMemo(() => {
    return points.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
      weight: point.weight,
    }));
  }, [points]);

  /**
   * Don't render if not visible or no points
   */
  if (!visible || points.length === 0) {
    return null;
  }

  /**
   * Use native Heatmap on Android
   * On iOS, Heatmap requires Google Maps provider
   * Fall back to circles for better compatibility
   */
  if (Platform.OS === 'android') {
    return (
      <Heatmap
        points={weightedLocations}
        radius={radius}
        opacity={opacity}
        gradient={gradient}
      />
    );
  }

  /**
   * Fallback: Render circles for iOS or when Heatmap is not available
   * This provides a similar visual effect using individual circles
   */
  return (
    <>
      {points.map((point, index) => (
        <Circle
          key={`heatmap-circle-${index}-${point.latitude}-${point.longitude}`}
          center={{
            latitude: point.latitude,
            longitude: point.longitude,
          }}
          radius={radius * (0.5 + point.weight * 0.5)} // Scale radius by weight
          fillColor={getCircleColor(point.weight)}
          strokeColor="transparent"
          strokeWidth={0}
          zIndex={0}
        />
      ))}
    </>
  );
};

/**
 * Memoized HeatmapLayer to prevent unnecessary re-renders
 * Requirement 15.1, 15.2: Optimize performance
 */
export const HeatmapLayer = memo(
  HeatmapLayerComponent,
  (prevProps, nextProps) => {
    // Custom comparison for performance
    if (prevProps.visible !== nextProps.visible) {
      return false;
    }
    if (prevProps.radius !== nextProps.radius) {
      return false;
    }
    if (prevProps.opacity !== nextProps.opacity) {
      return false;
    }
    // Deep compare points array - only re-render if points actually changed
    if (!arrayEqual(prevProps.points, nextProps.points)) {
      return false;
    }
    return true;
  },
);

HeatmapLayer.displayName = 'HeatmapLayer';

/**
 * Optimized HeatmapLayer that clusters nearby points
 * Use this for large datasets to improve performance
 */
const OptimizedHeatmapLayerComponent: React.FC<HeatmapLayerProps> = ({
  points,
  visible = true,
  radius = DEFAULT_RADIUS,
  opacity = DEFAULT_OPACITY,
  gradient = DEFAULT_GRADIENT,
}) => {
  /**
   * Cluster nearby points to reduce rendering overhead
   */
  const clusteredPoints = useMemo(() => {
    if (points.length <= 100) {
      return points;
    }

    // Simple grid-based clustering
    const gridSize = 0.001; // ~100m at equator
    const clusters = new Map<string, HeatmapPoint>();

    for (const point of points) {
      const gridX = Math.floor(point.latitude / gridSize);
      const gridY = Math.floor(point.longitude / gridSize);
      const key = `${gridX},${gridY}`;

      const existing = clusters.get(key);
      if (existing) {
        // Merge points: average position, max weight
        clusters.set(key, {
          latitude: (existing.latitude + point.latitude) / 2,
          longitude: (existing.longitude + point.longitude) / 2,
          weight: Math.max(existing.weight, point.weight),
        });
      } else {
        clusters.set(key, {...point});
      }
    }

    return Array.from(clusters.values());
  }, [points]);

  return (
    <HeatmapLayer
      points={clusteredPoints}
      visible={visible}
      radius={radius}
      opacity={opacity}
      gradient={gradient}
    />
  );
};

/**
 * Memoized OptimizedHeatmapLayer
 */
export const OptimizedHeatmapLayer = memo(
  OptimizedHeatmapLayerComponent,
  (prevProps, nextProps) => {
    if (prevProps.visible !== nextProps.visible) {
      return false;
    }
    if (prevProps.radius !== nextProps.radius) {
      return false;
    }
    if (prevProps.opacity !== nextProps.opacity) {
      return false;
    }
    if (!arrayEqual(prevProps.points, nextProps.points)) {
      return false;
    }
    return true;
  },
);

OptimizedHeatmapLayer.displayName = 'OptimizedHeatmapLayer';

export default HeatmapLayer;
