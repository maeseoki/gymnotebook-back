import { onlineManager } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { createExpoNetworkProvider } from '@/shared/network/network-state';
import { installNetworkOnlineManager } from '@/shared/query/client';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn(),
  NetworkStateType: {
    UNKNOWN: 'unknown',
  },
}));

describe('network state abstraction', () => {
  it('maps Expo network state to online/offline/unknown', async () => {
    jest.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.UNKNOWN,
    });

    await expect(createExpoNetworkProvider().getState()).resolves.toEqual({
      availability: 'offline',
      isInternetReachable: false,
    });
  });

  it('updates TanStack Query online state from initial state, changes and cleanup', async () => {
    const remove = jest.fn();
    const listeners: Array<(state: Network.NetworkState) => void> = [];
    jest.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.UNKNOWN,
    });
    jest.mocked(Network.addNetworkStateListener).mockImplementationOnce((callback) => {
      listeners.push(callback);
      return { remove };
    });

    const cleanup = installNetworkOnlineManager(createExpoNetworkProvider());

    await waitFor(() => expect(onlineManager.isOnline()).toBe(false));
    const listener = listeners[0];
    if (!listener) {
      throw new Error('Expected network listener to be registered.');
    }

    listener({
      isConnected: true,
      isInternetReachable: true,
      type: Network.NetworkStateType.UNKNOWN,
    });
    expect(onlineManager.isOnline()).toBe(true);
    cleanup();
    listener({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.UNKNOWN,
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(onlineManager.isOnline()).toBe(true);
  });
});
