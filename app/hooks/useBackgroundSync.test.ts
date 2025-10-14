/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBackgroundSync } from './useBackgroundSync';

// Mock service worker with sync support
const mockServiceWorkerWithSync = {
  ready: Promise.resolve({
    sync: {
      register: jest.fn().mockResolvedValue(undefined),
    },
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockServiceWorkerWithoutSync = {
  ready: Promise.resolve({}),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

describe('useBackgroundSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default values when sync is supported', async () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: mockServiceWorkerWithSync,
    });

    const { result } = renderHook(() => useBackgroundSync());
    
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });
    
    expect(result.current.isSyncing).toBe(false);
  });

  it('should detect when background sync is not supported', async () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: mockServiceWorkerWithoutSync,
    });

    const { result } = renderHook(() => useBackgroundSync());
    
    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });
  });

  it('should detect when service worker is not available', async () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useBackgroundSync());
    
    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });
  });

  it('should register a background sync successfully', async () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: mockServiceWorkerWithSync,
    });

    const { result } = renderHook(() => useBackgroundSync());
    
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });
    
    let registered = false;
    await act(async () => {
      registered = await result.current.registerSync('test-sync');
    });
    
    expect(registered).toBe(true);
    expect(mockServiceWorkerWithSync.ready).toBeDefined();
  });

  it('should not register sync when not supported', async () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: mockServiceWorkerWithoutSync,
    });

    const { result } = renderHook(() => useBackgroundSync());
    
    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });
    
    let registered = true;
    await act(async () => {
      registered = await result.current.registerSync('test-sync');
    });
    
    expect(registered).toBe(false);
  });

  it('should handle sync registration errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockFailingSync = {
      ready: Promise.resolve({
        sync: {
          register: jest.fn().mockRejectedValue(new Error('Sync error')),
        },
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: mockFailingSync,
    });

    const { result } = renderHook(() => useBackgroundSync());
    
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });
    
    let registered = true;
    await act(async () => {
      registered = await result.current.registerSync('test-sync');
    });
    
    expect(registered).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  it('should update syncing state on message events', async () => {
    let messageListener: ((event: MessageEvent) => void) | null = null;
    
    const mockSW = {
      ready: Promise.resolve({
        sync: {
          register: jest.fn().mockResolvedValue(undefined),
        },
      }),
      addEventListener: jest.fn((event: string, listener: (event: MessageEvent) => void) => {
        if (event === 'message') {
          messageListener = listener;
        }
      }),
      removeEventListener: jest.fn(),
    };

    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: mockSW,
    });

    const { result } = renderHook(() => useBackgroundSync());
    
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });
    
    // Simulate sync started message
    if (messageListener) {
      act(() => {
        messageListener({ data: { type: 'SYNC_STARTED' } } as MessageEvent);
      });
    }
    
    expect(result.current.isSyncing).toBe(true);
    
    // Simulate sync completed message
    if (messageListener) {
      act(() => {
        messageListener({ data: { type: 'SYNC_COMPLETED' } } as MessageEvent);
      });
    }
    
    expect(result.current.isSyncing).toBe(false);
  });

  it('should clean up event listeners on unmount', async () => {
    const mockSW = {
      ready: Promise.resolve({
        sync: {
          register: jest.fn().mockResolvedValue(undefined),
        },
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: mockSW,
    });

    const { unmount } = renderHook(() => useBackgroundSync());
    
    await waitFor(() => {
      expect(mockSW.addEventListener).toHaveBeenCalled();
    });
    
    unmount();
    
    expect(mockSW.removeEventListener).toHaveBeenCalled();
  });
});
