/**
 * Network Service
 * Handles network connectivity detection and monitoring
 * Addresses Requirement 14.5: Offline state detection and handling
 */

import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  status: NetworkStatus;
}

export type NetworkChangeCallback = (state: NetworkState) => void;

export interface NetworkService {
  /**
   * Get current network state
   */
  getCurrentState(): Promise<NetworkState>;

  /**
   * Subscribe to network state changes
   * @param callback Function to call when network state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: NetworkChangeCallback): () => void;

  /**
   * Check if device is currently online
   */
  isOnline(): Promise<boolean>;

  /**
   * Check if internet is reachable (not just connected to network)
   */
  isInternetReachable(): Promise<boolean>;
}

/**
 * Transform NetInfo state to our NetworkState format
 */
const transformNetInfoState = (state: NetInfoState): NetworkState => {
  const isConnected = state.isConnected ?? false;
  const isInternetReachable = state.isInternetReachable;

  let status: NetworkStatus = 'unknown';
  if (isConnected && isInternetReachable === true) {
    status = 'online';
  } else if (isConnected === false || isInternetReachable === false) {
    status = 'offline';
  }

  return {
    isConnected,
    isInternetReachable,
    type: state.type,
    status,
  };
};

/**
 * Network service implementation using @react-native-community/netinfo
 */
class NetworkServiceImpl implements NetworkService {
  private subscribers: Set<NetworkChangeCallback> = new Set();
  private subscription: NetInfoSubscription | null = null;
  private lastState: NetworkState | null = null;

  constructor() {
    this.initializeSubscription();
  }

  private initializeSubscription(): void {
    this.subscription = NetInfo.addEventListener(state => {
      const networkState = transformNetInfoState(state);
      this.lastState = networkState;
      this.notifySubscribers(networkState);
    });
  }

  private notifySubscribers(state: NetworkState): void {
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[NetworkService] Error in subscriber callback:', error);
      }
    });
  }

  async getCurrentState(): Promise<NetworkState> {
    const state = await NetInfo.fetch();
    const networkState = transformNetInfoState(state);
    this.lastState = networkState;
    return networkState;
  }

  subscribe(callback: NetworkChangeCallback): () => void {
    this.subscribers.add(callback);

    // Immediately notify with last known state if available
    if (this.lastState) {
      callback(this.lastState);
    } else {
      // Fetch current state and notify
      this.getCurrentState().then(state => {
        callback(state);
      });
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  async isOnline(): Promise<boolean> {
    const state = await this.getCurrentState();
    return state.status === 'online';
  }

  async isInternetReachable(): Promise<boolean> {
    const state = await this.getCurrentState();
    return state.isInternetReachable === true;
  }

  /**
   * Cleanup subscription (for testing or app shutdown)
   */
  cleanup(): void {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.subscribers.clear();
  }
}

// Export singleton instance
export const networkService: NetworkService = new NetworkServiceImpl();

export default networkService;
