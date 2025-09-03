import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiKey } from '../useApiKey';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with null API key when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBeNull();
      expect(result.current.isConfigured).toBe(false);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('openai_api_key');
    });

    it('should initialize with API key from localStorage', () => {
      const testApiKey = 'sk-test-key-12345';
      mockLocalStorage.getItem.mockReturnValue(testApiKey);
      
      const { result } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBe(testApiKey);
      expect(result.current.isConfigured).toBe(true);
    });

    it('should handle malformed data in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      const { result } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBe('invalid-json');
      expect(result.current.isConfigured).toBe(true);
    });

    it('should handle localStorage access errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBeNull();
      expect(result.current.isConfigured).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load API key from localStorage:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('setApiKey', () => {
    it('should set API key and save to localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      const testApiKey = 'sk-new-key-67890';
      
      act(() => {
        result.current.setApiKey(testApiKey);
      });
      
      expect(result.current.apiKey).toBe(testApiKey);
      expect(result.current.isConfigured).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('openai_api_key', testApiKey);
    });

    it('should handle null API key', () => {
      mockLocalStorage.getItem.mockReturnValue('existing-key');
      
      const { result } = renderHook(() => useApiKey());
      
      act(() => {
        result.current.setApiKey(null);
      });
      
      expect(result.current.apiKey).toBeNull();
      expect(result.current.isConfigured).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_api_key');
    });

    it('should handle empty string API key', () => {
      mockLocalStorage.getItem.mockReturnValue('existing-key');
      
      const { result } = renderHook(() => useApiKey());
      
      act(() => {
        result.current.setApiKey('');
      });
      
      expect(result.current.apiKey).toBeNull();
      expect(result.current.isConfigured).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_api_key');
    });

    it('should trim whitespace from API key', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      act(() => {
        result.current.setApiKey('  sk-trimmed-key  ');
      });
      
      expect(result.current.apiKey).toBe('sk-trimmed-key');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('openai_api_key', 'sk-trimmed-key');
    });

    it('should handle localStorage write errors', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage write failed');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useApiKey());
      
      act(() => {
        result.current.setApiKey('sk-test-key');
      });
      
      // State should still be updated even if localStorage fails
      expect(result.current.apiKey).toBe('sk-test-key');
      expect(result.current.isConfigured).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save API key to localStorage:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('clearApiKey', () => {
    it('should clear API key and remove from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('existing-key');
      
      const { result } = renderHook(() => useApiKey());
      
      act(() => {
        result.current.clearApiKey();
      });
      
      expect(result.current.apiKey).toBeNull();
      expect(result.current.isConfigured).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('openai_api_key');
    });

    it('should handle localStorage remove errors', () => {
      mockLocalStorage.getItem.mockReturnValue('existing-key');
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('localStorage remove failed');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useApiKey());
      
      act(() => {
        result.current.clearApiKey();
      });
      
      // State should still be updated even if localStorage fails
      expect(result.current.apiKey).toBeNull();
      expect(result.current.isConfigured).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to remove API key from localStorage:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('API Key Validation', () => {
    it('should validate OpenAI API key format', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      // Valid OpenAI API key format
      act(() => {
        result.current.setApiKey('sk-1234567890abcdef1234567890abcdef12345678');
      });
      
      expect(result.current.isConfigured).toBe(true);
    });

    it('should accept various valid API key formats', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      const validKeys = [
        'sk-1234567890abcdef',
        'sk-proj-1234567890abcdef',
        'sk-1234567890abcdef1234567890abcdef12345678',
      ];
      
      validKeys.forEach(key => {
        act(() => {
          result.current.setApiKey(key);
        });
        
        expect(result.current.isConfigured).toBe(true);
        expect(result.current.apiKey).toBe(key);
      });
    });

    it('should handle potentially invalid API key formats gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      // Even if format looks invalid, we should still store it
      // as the server will validate it properly
      act(() => {
        result.current.setApiKey('invalid-format-key');
      });
      
      expect(result.current.apiKey).toBe('invalid-format-key');
      expect(result.current.isConfigured).toBe(true);
    });
  });

  describe('State Persistence', () => {
    it('should persist API key across hook re-renders', () => {
      mockLocalStorage.getItem.mockReturnValue('persistent-key');
      
      const { result, rerender } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBe('persistent-key');
      
      rerender();
      
      expect(result.current.apiKey).toBe('persistent-key');
      expect(result.current.isConfigured).toBe(true);
    });

    it('should update when localStorage changes externally', () => {
      mockLocalStorage.getItem.mockReturnValue('initial-key');
      
      const { result } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBe('initial-key');
      
      // Simulate external localStorage change
      mockLocalStorage.getItem.mockReturnValue('updated-key');
      
      // Trigger storage event
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'openai_api_key',
          newValue: 'updated-key',
          oldValue: 'initial-key'
        }));
      });
      
      expect(result.current.apiKey).toBe('updated-key');
    });

    it('should handle storage event for API key removal', () => {
      mockLocalStorage.getItem.mockReturnValue('existing-key');
      
      const { result } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBe('existing-key');
      
      // Simulate external localStorage removal
      mockLocalStorage.getItem.mockReturnValue(null);
      
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'openai_api_key',
          newValue: null,
          oldValue: 'existing-key'
        }));
      });
      
      expect(result.current.apiKey).toBeNull();
      expect(result.current.isConfigured).toBe(false);
    });

    it('should ignore storage events for other keys', () => {
      mockLocalStorage.getItem.mockReturnValue('unchanged-key');
      
      const { result } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBe('unchanged-key');
      
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'other_key',
          newValue: 'other-value',
          oldValue: null
        }));
      });
      
      expect(result.current.apiKey).toBe('unchanged-key');
    });
  });

  describe('Multiple Hook Instances', () => {
    it('should synchronize state across multiple hook instances', () => {
      mockLocalStorage.getItem.mockReturnValue('shared-key');
      
      const { result: result1 } = renderHook(() => useApiKey());
      const { result: result2 } = renderHook(() => useApiKey());
      
      expect(result1.current.apiKey).toBe('shared-key');
      expect(result2.current.apiKey).toBe('shared-key');
      
      // Update from first instance
      act(() => {
        result1.current.setApiKey('new-shared-key');
      });
      
      // Both instances should be updated
      expect(result1.current.apiKey).toBe('new-shared-key');
      expect(result2.current.apiKey).toBe('new-shared-key');
    });

    it('should handle concurrent updates from multiple instances', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result: result1 } = renderHook(() => useApiKey());
      const { result: result2 } = renderHook(() => useApiKey());
      
      // Concurrent updates
      act(() => {
        result1.current.setApiKey('key-from-instance-1');
        result2.current.setApiKey('key-from-instance-2');
      });
      
      // Last update should win
      expect(result1.current.apiKey).toBe('key-from-instance-2');
      expect(result2.current.apiKey).toBe('key-from-instance-2');
    });
  });

  describe('Memory Management', () => {
    it('should clean up storage event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useApiKey());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('should not cause memory leaks with multiple mount/unmount cycles', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      // Mount and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderHook(() => useApiKey());
        unmount();
      }
      
      // Should have equal number of add and remove calls
      expect(addEventListenerSpy).toHaveBeenCalledTimes(5);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(5);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined localStorage', () => {
      // Simulate environment without localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useApiKey());
      
      expect(result.current.apiKey).toBeNull();
      expect(result.current.isConfigured).toBe(false);
      
      // Should handle setApiKey gracefully
      act(() => {
        result.current.setApiKey('test-key');
      });
      
      expect(result.current.apiKey).toBe('test-key');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        configurable: true
      });
    });

    it('should handle very long API keys', () => {
      const longApiKey = 'sk-' + 'a'.repeat(1000);
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      act(() => {
        result.current.setApiKey(longApiKey);
      });
      
      expect(result.current.apiKey).toBe(longApiKey);
      expect(result.current.isConfigured).toBe(true);
    });

    it('should handle special characters in API key', () => {
      const specialApiKey = 'sk-test+key/with=special&chars';
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      act(() => {
        result.current.setApiKey(specialApiKey);
      });
      
      expect(result.current.apiKey).toBe(specialApiKey);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('openai_api_key', specialApiKey);
    });

    it('should handle rapid successive API key changes', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useApiKey());
      
      const keys = ['key1', 'key2', 'key3', 'key4', 'key5'];
      
      act(() => {
        keys.forEach(key => {
          result.current.setApiKey(key);
        });
      });
      
      // Should end up with the last key
      expect(result.current.apiKey).toBe('key5');
      expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith('openai_api_key', 'key5');
    });
  });
});