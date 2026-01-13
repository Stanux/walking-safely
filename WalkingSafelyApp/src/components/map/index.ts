/**
 * Map Components
 * Export all map-related components
 */

export {MapView, type MapViewProps, type MapViewRef} from './MapView';
export {
  RoutePolyline,
  type RoutePolylineProps,
  decodePolyline,
} from './RoutePolyline';
export {
  RiskPointMarker,
  type RiskPointMarkerProps,
  getMarkerColor,
} from './RiskPointMarker';
export {RiskPointPopup, type RiskPointPopupProps} from './RiskPointPopup';
export {
  splitRouteByPosition,
  getRouteSegmentColor,
  calculateRouteProgress,
  generateRouteSegments,
  findClosestPointIndex,
  calculateDistanceBetweenPoints,
  type RouteSegment,
  type SplitRouteResult,
} from './TraveledRoute';
