/**
 * Navigation Constants
 * Constants for navigation guidance, route display, and risk alerts
 * Requirements: 12.1, 12.2, 15.4, 16.1
 */

// Route Deviation and Recalculation
export const DEVIATION_THRESHOLD = 30; // meters - triggers route recalculation (Req 16.1)
export const INSTRUCTION_ADVANCE_DISTANCE = 50; // meters - advance to next instruction
export const VOICE_ADVANCE_DISTANCE = 100; // meters - narrate next instruction in advance

// Risk Alert Configuration
export const RISK_ALERT_DISTANCE = 200; // meters - distance to trigger risk alert (Req 15.4)

// Position Tracking
export const POSITION_UPDATE_INTERVAL = 1000; // ms between position updates
export const MAP_ROTATION_ENABLED = true; // rotate map based on heading

// Route Colors (Req 12.1, 12.2)
export const ROUTE_COLORS = {
  traveled: '#78909C', // Gray-blue - traveled segment
  remaining: '#2196F3', // Blue - remaining segment
  origin: '#4CAF50', // Green - start point
  destination: '#F44336', // Red - end point
} as const;

// Route Line Styling
export const ROUTE_LINE_WIDTH = 5;
export const ROUTE_LINE_OPACITY = 0.9;

// Maneuver Types for Navigation Instructions
export type ManeuverType =
  | 'depart'
  | 'arrive'
  | 'turn-left'
  | 'turn-right'
  | 'turn-slight-left'
  | 'turn-slight-right'
  | 'turn-sharp-left'
  | 'turn-sharp-right'
  | 'uturn-left'
  | 'uturn-right'
  | 'straight'
  | 'roundabout';

// Maneuver Icons Mapping
export const MANEUVER_ICONS: Record<ManeuverType, string> = {
  depart: 'navigation',
  arrive: 'flag-checkered',
  'turn-left': 'arrow-left',
  'turn-right': 'arrow-right',
  'turn-slight-left': 'arrow-top-left',
  'turn-slight-right': 'arrow-top-right',
  'turn-sharp-left': 'arrow-bottom-left',
  'turn-sharp-right': 'arrow-bottom-right',
  'uturn-left': 'u-turn-left',
  'uturn-right': 'u-turn-right',
  straight: 'arrow-up',
  roundabout: 'rotate-right',
} as const;
