/**
 * NetworkContext
 * Provides network connectivity state throughout the app
 * Addresses Requirement 14.5: Offline state detection and handling
 */

import React, {createContext, useContext, useMemo} from 'react';
import {useNetwork, UseNetworkReturn} from '../hooks/useNetwork';

// Create context with undefined default (will be provided by NetworkProvider)
const NetworkContext = createContext<UseNetworkReturn | undefined>(undefined);

export interface NetworkProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that wraps the app and provides network state
 */
export const NetworkProvider: React.FC<NetworkProviderProps> = ({children}) => {
  const networkState = useNetwork();

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => networkState,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      networkState.isConnected,
      networkState.isInternetReachable,
      networkState.connectionType,
      networkState.status,
      networkState.isLoading,
      networkState.refresh,
    ],
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
};

/**
 * Hook to access network context
 * Must be used within a NetworkProvider
 *
 * @example
 * ```tsx
 * const { isConnected, status } = useNetworkContext();
 *
 * if (!isConnected) {
 *   // Handle offline state
 * }
 * ```
 */
export function useNetworkContext(): UseNetworkReturn {
  const context = useContext(NetworkContext);

  if (context === undefined) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }

  return context;
}

/**
 * HOC to check if a component should be disabled when offline
 * @param WrappedComponent Component to wrap
 * @param options Configuration options
 */
export function withNetworkCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    /** Whether to completely hide the component when offline */
    hideWhenOffline?: boolean;
    /** Custom component to render when offline */
    offlineFallback?: React.ComponentType<P>;
  },
): React.FC<P> {
  const {hideWhenOffline = false, offlineFallback: OfflineFallback} =
    options ?? {};

  return function WithNetworkCheckComponent(props: P) {
    const {isConnected} = useNetworkContext();

    if (!isConnected) {
      if (hideWhenOffline) {
        return null;
      }
      if (OfflineFallback) {
        return <OfflineFallback {...props} />;
      }
    }

    return <WrappedComponent {...props} />;
  };
}

export default NetworkContext;
