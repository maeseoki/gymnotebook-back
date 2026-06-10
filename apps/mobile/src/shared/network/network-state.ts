import * as Network from 'expo-network';

export type NetworkAvailability = 'online' | 'offline' | 'unknown';

export interface NetworkState {
  availability: NetworkAvailability;
  isInternetReachable: boolean | null;
}

export interface NetworkProvider {
  getState: () => Promise<NetworkState>;
  subscribe?: (listener: (state: NetworkState) => void) => () => void;
}

export function createExpoNetworkProvider(): NetworkProvider {
  return {
    async getState() {
      return toNetworkState(await Network.getNetworkStateAsync());
    },
    subscribe(listener) {
      const subscription = Network.addNetworkStateListener((state) => {
        listener(toNetworkState(state));
      });

      return () => {
        subscription.remove();
      };
    },
  };
}

export function toNetworkState(state: Network.NetworkState): NetworkState {
  if (state.isConnected === false) {
    return { availability: 'offline', isInternetReachable: state.isInternetReachable ?? null };
  }
  if (state.isConnected === true) {
    return {
      availability: state.isInternetReachable === false ? 'unknown' : 'online',
      isInternetReachable: state.isInternetReachable ?? null,
    };
  }
  return { availability: 'unknown', isInternetReachable: state.isInternetReachable ?? null };
}
