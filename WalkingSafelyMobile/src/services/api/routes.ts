/**
 * Routes API Service
 * Handles route calculation and recalculation
 */

import {apiClient} from './client';
import {TrafficUpdateResponse} from '../../types/api';
import {
  RouteRequest,
  RouteResponse,
  RouteRecalculationResponse,
  RouteInstruction,
  Coordinates,
} from '../../types/models';
import i18n from '../../i18n';

/**
 * Routes service interface
 */
export interface RoutesService {
  calculateRoute(request: RouteRequest): Promise<RouteResponse>;
  recalculateRoute(
    sessionId: string,
    currentPosition: Coordinates,
  ): Promise<RouteRecalculationResponse>;
  getAlternativeRoutes(request: RouteRequest): Promise<RouteResponse[]>;
  checkTrafficUpdate(
    sessionId: string,
    currentPosition: Coordinates,
  ): Promise<TrafficUpdateResponse>;
}

/**
 * Routes API endpoints
 */
const ROUTES_ENDPOINTS = {
  CALCULATE: '/routes',
  RECALCULATE: '/routes/recalculate',
  ALTERNATIVES: '/routes/alternatives',
  TRAFFIC: '/routes/traffic',
} as const;

/**
 * Backend API response types
 */
interface BackendOccurrence {
  id: number;
  timestamp: string;
  location: { latitude: number; longitude: number };
  crime_type: { id: number; name: string };
  severity: { value: string; label: string };
  confidence_score: number;
  source: string;
}

interface BackendRouteData {
  route: {
    id: string;
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    waypoints: Array<{ latitude: number; longitude: number }>;
    distance: number;
    duration: number;
    polyline: string;
    provider: string;
  };
  risk_analysis: {
    max_risk_index: number;
    average_risk_index: number;
    risk_level: string;
    has_high_risk_regions: boolean;
  };
  warning: {
    requires_warning: boolean;
    message: string | null;
  };
}

interface BackendRouteResponse {
  data: BackendRouteData;
  occurrences?: BackendOccurrence[];
  session_id?: string;
}

/**
 * Routes service implementation
 */
export const routesService: RoutesService = {
  /**
   * Calculate a route between origin and destination
   */
  async calculateRoute(request: RouteRequest): Promise<RouteResponse> {
    console.log('[RoutesService] Calculating route:', JSON.stringify(request));
    
    const response = await apiClient.post<BackendRouteResponse>(
      ROUTES_ENDPOINTS.CALCULATE,
      {
        origin: {
          latitude: request.origin.latitude,
          longitude: request.origin.longitude,
        },
        destination: {
          latitude: request.destination.latitude,
          longitude: request.destination.longitude,
        },
        prefer_safe_route: request.preferSafeRoute || false,
      },
    );

    console.log('[RoutesService] Raw response:', JSON.stringify(response));

    // Handle the response structure - apiClient already extracts response.data
    // So we receive { data: { route, risk_analysis, warning }, occurrences } directly
    const fullResponse = response as BackendRouteResponse;
    const responseData = fullResponse.data || (response as unknown as BackendRouteData);
    const route = responseData?.route;
    const risk_analysis = responseData?.risk_analysis;
    const warning = responseData?.warning;
    const backendOccurrences = fullResponse.occurrences || [];

    if (!route) {
      console.error('[RoutesService] No route in response:', response);
      throw new Error('No route returned from server');
    }

    console.log('[RoutesService] Route polyline length:', route.polyline?.length || 0);
    console.log('[RoutesService] Occurrences count:', backendOccurrences.length);

    // Map occurrences to frontend format
    const occurrences = backendOccurrences.map(occ => ({
      id: String(occ.id),
      location: {
        latitude: occ.location.latitude,
        longitude: occ.location.longitude,
      },
      crimeType: occ.crime_type?.name || 'Unknown',
      severity: occ.severity?.value || 'medium',
      timestamp: occ.timestamp,
    }));

    // Create basic instructions from route data
    const instructions: RouteInstruction[] = [];
    
    // Add start instruction
    instructions.push({
      text: i18n.t('navigation.instructions.depart'),
      distance: 0,
      duration: 0,
      maneuver: 'depart',
      coordinates: route.origin,
    });
    
    // Add waypoint instructions if available
    if (route.waypoints && route.waypoints.length > 0) {
      route.waypoints.forEach((waypoint, index) => {
        instructions.push({
          text: i18n.t('navigation.instructions.continue'),
          distance: 0, // Would be calculated from polyline
          duration: 0,
          maneuver: 'straight',
          coordinates: waypoint,
        });
      });
    }
    
    // Add end instruction
    instructions.push({
      text: i18n.t('navigation.instructions.arrive'),
      distance: route.distance,
      duration: route.duration,
      maneuver: 'arrive',
      coordinates: route.destination,
    });

    const result: RouteResponse = {
      id: route.id || `route_${Date.now()}`,
      polyline: route.polyline || '',
      distance: route.distance || 0,
      duration: route.duration || 0,
      maxRiskIndex: risk_analysis?.max_risk_index || 0,
      averageRiskIndex: risk_analysis?.average_risk_index || 0,
      requiresWarning: warning?.requires_warning || false,
      warningMessage: warning?.message || undefined,
      instructions,
      occurrences,
    };

    console.log('[RoutesService] Parsed route with occurrences:', JSON.stringify(result));
    return result;
  },

  /**
   * Recalculate route when user deviates from path
   */
  async recalculateRoute(
    sessionId: string,
    currentPosition: Coordinates,
  ): Promise<RouteRecalculationResponse> {
    const response = await apiClient.post<{data: RouteRecalculationResponse}>(
      ROUTES_ENDPOINTS.RECALCULATE,
      {
        session_id: sessionId,
        current_position: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
        },
      },
    );
    return response.data;
  },

  /**
   * Get alternative routes for comparison
   */
  async getAlternativeRoutes(request: RouteRequest): Promise<RouteResponse[]> {
    try {
      const response = await apiClient.post<{data: {routes: RouteResponse[]}}>(
        ROUTES_ENDPOINTS.ALTERNATIVES,
        {
          origin: {
            latitude: request.origin.latitude,
            longitude: request.origin.longitude,
          },
          destination: {
            latitude: request.destination.latitude,
            longitude: request.destination.longitude,
          },
          prefer_safe_route: request.preferSafeRoute || false,
        },
      );
      return response.data?.routes || [];
    } catch (error) {
      console.log('[RoutesService] Alternative routes error (non-critical):', error);
      return [];
    }
  },

  /**
   * Check for traffic updates during active navigation
   */
  async checkTrafficUpdate(
    sessionId: string,
    currentPosition: Coordinates,
  ): Promise<TrafficUpdateResponse> {
    const response = await apiClient.post<{data: TrafficUpdateResponse}>(
      ROUTES_ENDPOINTS.TRAFFIC,
      {
        session_id: sessionId,
        current_position: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
        },
      },
    );
    return response.data;
  },
};

export default routesService;
