/**
 * useNetwork Hook
 * Provides network connectivity state and utilities
 * Addresses Requirement 14.5: Offline state detection and handling
 */

import {useState, useEffect, useCallback} from 'react';
import {networkService, NetworkState, NetworkStatus} from '../services/network';

export interface UseNetworkState {
  /** Whether the device is connected to a network */
  isConnected: boolean;
  /** Whether internet is reachable (not just connected to network) */
  isInternetReachable: boolean | null;
  /** Network connection type (wifi, cellular, etc.) */
  connectionType: string;
  /** Simplified network status */
  status: NetworkStatus;
  /** Whether the network state is still being determined */
  isLoading: boolean;
}

export interface UseNetworkActions {
  /** Manually refresh network state */
  refresh: () => Promise<void>;
}

export interface UseNetworkReturn extends UseNetworkState, UseNetworkActions {}

/**
 * Hook for monitoring network connectivity
 *
 * @example
 * ```tsx
 * const { isConnected, status, isLoading } = useNetwork();
 *
 * if (!isConnected) {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useNetwork(): UseNetworkReturn {
  const [state, setState] = useState<UseNetworkState>({
    isConnected: true, // Assume connected initially
    isInternetReachable: null,
    connectionType: 'unknown',
    status: 'unknown',
    isLoading: true,
  });

  const updateState = useCallback((networkState: NetworkState) => {
    setState({
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
      connectionType: networkState.type,
      status: networkState.status,
      isLoading: false,
    });
  }, []);

  const refresh = useCallback(async () => {
    setState(prev => ({...prev, isLoading: true}));
    try {
      const networkState = await networkService.getCurrentState();
      updateState(networkState);
    } catch (error) {
      console.error('[useNetwork] Error refreshing network state:', error);
      setState(prev => ({...prev, isLoading: false}));
    }
  }, [updateState]);

  useEffect(() => {
    // Subscribe to network changes
    const unsubscribe = networkService.subscribe(updateState);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [updateState]);

  return {
    ...state,
    refresh,
  };
}

export default useNetwork;
