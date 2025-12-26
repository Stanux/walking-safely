/**
 * Core Data Models
 * Type definitions for domain entities used throughout the app
 */

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Map bounds for viewport queries
 */
export interface MapBounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

/**
 * User roles in the system
 */
export type UserRole = 'user' | 'moderator' | 'admin';

/**
 * Authenticated user information
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  locale: string;
}

/**
 * Occurrence severity levels
 */
export type OccurrenceSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Source of occurrence data
 */
export type OccurrenceSource = 'collaborative' | 'official';

/**
 * Crime type definition
 */
export interface CrimeType {
  id: string;
  name: string;
  categoryId: string;
  localizedName?: string;
}

/**
 * Crime category (hierarchical)
 */
export interface CrimeCategory {
  id: string;
  name: string;
  parentId: string | null;
  localizedName?: string;
}

/**
 * Security occurrence/incident
 */
export interface Occurrence {
  id: string;
  timestamp: string;
  location: Coordinates;
  crimeType: CrimeType;
  severity: OccurrenceSeverity;
  confidenceScore: number;
  source: OccurrenceSource;
}

/**
 * Data for creating a new occurrence report
 */
export interface CreateOccurrenceData {
  location: Coordinates;
  timestamp: string;
  crimeTypeId: string;
  severity: OccurrenceSeverity;
  description?: string;
}

/**
 * Heatmap data point
 */
export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

/**
 * Filters for heatmap data requests
 */
export interface HeatmapFilters {
  crimeTypes?: string[];
  period?: 'last_24h' | 'last_7d' | 'last_30d';
}

/**
 * Route instruction for turn-by-turn navigation
 */
export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  maneuver: string;
  coordinates: Coordinates;
}

/**
 * Route occurrence for display on map
 */
export interface RouteOccurrence {
  id: string;
  location: Coordinates;
  crimeType: string;
  severity: string;
  timestamp: string;
}

/**
 * Route response from backend
 */
export interface RouteResponse {
  id: string;
  polyline: string;
  distance: number; // meters
  duration: number; // seconds
  maxRiskIndex: number;
  averageRiskIndex: number;
  requiresWarning: boolean;
  warningMessage?: string;
  instructions: RouteInstruction[];
  occurrences?: RouteOccurrence[];
}

/**
 * Route calculation request
 */
export interface RouteRequest {
  origin: Coordinates;
  destination: Coordinates;
  preferSafeRoute?: boolean;
}

/**
 * Route recalculation response
 */
export interface RouteRecalculationResponse {
  route: RouteResponse;
  hasAlternative: boolean;
  alternativeRoute?: RouteResponse;
  timeDifference?: number;
  riskDifference?: number;
}

/**
 * Alert schedule configuration
 */
export interface AlertSchedule {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
}

/**
 * User alert preferences
 */
export interface AlertPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  types: string[];
  schedule: AlertSchedule | null;
}

/**
 * Alert types
 */
export type AlertType = 'high_risk' | 'route_change' | 'traffic';

/**
 * Alert notification
 */
export interface Alert {
  type: AlertType;
  title: string;
  message: string;
  riskIndex?: number;
  crimeType?: string;
}

/**
 * Address from geocoding
 */
export interface Address {
  id: string;
  formattedAddress: string;
  coordinates: Coordinates;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Navigation session state
 */
export interface NavigationSession {
  id: string;
  route: RouteResponse;
  startTime: string;
  currentPosition: Coordinates;
  currentInstructionIndex: number;
}
