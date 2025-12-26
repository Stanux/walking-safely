/**
 * Custom Hooks Exports
 * Central export point for all custom hooks
 */

// Location Hook
export {
  useLocation,
  type UseLocationState,
  type UseLocationActions,
  type UseLocationReturn,
  type UseLocationOptions,
} from './useLocation';

// Alerts Hook
export {
  useAlerts,
  type UseAlertsState,
  type UseAlertsActions,
  type UseAlertsReturn,
  type UseAlertsOptions,
} from './useAlerts';

// Heatmap Hook
export {
  useHeatmap,
  type UseHeatmapOptions,
  type UseHeatmapReturn,
} from './useHeatmap';

// Network Hook
export {
  useNetwork,
  type UseNetworkState,
  type UseNetworkActions,
  type UseNetworkReturn,
} from './useNetwork';

// Background Hook
export {
  useBackground,
  type UseBackgroundOptions,
  type UseBackgroundReturn,
} from './useBackground';

// Other hooks will be exported here as they are created
// export { useAuth } from './useAuth';
