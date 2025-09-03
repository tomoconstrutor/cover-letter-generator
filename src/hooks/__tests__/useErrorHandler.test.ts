import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, useFormErrors, useErrorToasts } from '../useErrorHandler';
import type { AppError } from '../../types';
import { ErrorType } from '../../types';

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic error handling', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useErrorHandler());
      const [state] = result.current;

      expect(state.error).toBeNull();
      expect(state.isRetrying).toBe(false);
      expect(state.retryCount).toBe(0);
      expect(state.canRetry).toBe(false);
    });

    it('should set error when setError is called', () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const testError: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true
      };

      act(() => {
        actions.setError(testError);
      });

      const [state] = result.current;
      expect(state.error).toEqual(testError);
      expect(state.canRetry).toBe(true);
    });

    it('should clear error when clearError is called', () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const testError: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true
      };

      act(() => {
        actions.setError(testError);
      });

      act(() => {
        actions.clearError();
      });

      const [state] = result.current;
      expect(state.error).toBeNull();
      expect(state.canRetry).toBe(false);
      expect(state.retryCount).toBe(0);
    });
  });

  describe('withErrorHandling', () => {
    it('should handle successful operations', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const operation = vi.fn().mockResolvedValue('success');

      let operationResult: string | null = null;
      await act(async () => {
        operationResult = await actions.withErrorHandling(operation);
      });

      expect(operationResult).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);

      const [state] = result.current;
      expect(state.error).toBeNull();
    });

    it('should handle failed operations', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const testError = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(testError);

      let operationResult: string | null = null;
      await act(async () => {
        operationResult = await actions.withErrorHandling(operation);
      });

      expect(operationResult).toBeNull();
      expect(operation).toHaveBeenCalledTimes(1);

      const [state] = result.current;
      expect(state.error).not.toBeNull();
      expect(state.error?.message).toBe('Operation failed');
    });
  });

  describe('Retry functionality', () => {
    it('should create retryable operation', () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const operation = vi.fn().mockResolvedValue('success');

      act(() => {
        const retryManager = actions.createRetryableOperation(operation);
        expect(retryManager).toBeDefined();
        expect(typeof retryManager.execute).toBe('function');
        expect(typeof retryManager.retry).toBe('function');
        expect(typeof retryManager.canRetry).toBe('function');
      });
    });
  });

  describe('Configuration options', () => {
    it('should respect logErrors option', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useErrorHandler({ logErrors: false }));
      const [, actions] = result.current;

      const testError: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true
      };

      act(() => {
        actions.setError(testError);
      });

      // Should not log when logErrors is false
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log errors by default', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const testError: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true
      };

      act(() => {
        actions.setError(testError);
      });

      // Should log by default
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe('useFormErrors', () => {
  it('should initialize with no errors', () => {
    const { result } = renderHook(() => useFormErrors());
    const [state] = result.current;

    expect(state.fieldErrors).toEqual({});
    expect(state.generalError).toBeNull();
    expect(state.hasErrors).toBe(false);
  });

  it('should set field errors', () => {
    const { result } = renderHook(() => useFormErrors());
    const [, actions] = result.current;

    act(() => {
      actions.setFieldError('email', 'Invalid email format');
    });

    const [state] = result.current;
    expect(state.fieldErrors.email).toBe('Invalid email format');
    expect(state.hasErrors).toBe(true);
  });

  it('should clear field errors', () => {
    const { result } = renderHook(() => useFormErrors());
    const [, actions] = result.current;

    act(() => {
      actions.setFieldError('email', 'Invalid email format');
    });

    act(() => {
      actions.clearFieldError('email');
    });

    const [state] = result.current;
    expect(state.fieldErrors.email).toBeUndefined();
    expect(state.hasErrors).toBe(false);
  });

  it('should validate fields', () => {
    const { result } = renderHook(() => useFormErrors());
    const [, actions] = result.current;

    const validator = (value: string) => {
      if (!value) return 'Field is required';
      if (value.length < 3) return 'Field must be at least 3 characters';
      return null;
    };

    let isValid: boolean = false;

    act(() => {
      isValid = actions.validateField('username', '', validator);
    });

    expect(isValid).toBe(false);

    const [state] = result.current;
    expect(state.fieldErrors.username).toBe('Field is required');

    act(() => {
      isValid = actions.validateField('username', 'ab', validator);
    });

    expect(isValid).toBe(false);
    const [state2] = result.current;
    expect(state2.fieldErrors.username).toBe('Field must be at least 3 characters');

    act(() => {
      isValid = actions.validateField('username', 'abc', validator);
    });

    expect(isValid).toBe(true);
    const [state3] = result.current;
    expect(state3.fieldErrors.username).toBeUndefined();
  });

  it('should set and clear general errors', () => {
    const { result } = renderHook(() => useFormErrors());
    const [, actions] = result.current;

    const testError = new Error('General error');

    act(() => {
      actions.setGeneralError(testError);
    });

    const [state] = result.current;
    expect(state.generalError).not.toBeNull();
    expect(state.generalError?.message).toBe('General error');
    expect(state.hasErrors).toBe(true);

    act(() => {
      actions.clearGeneralError();
    });

    const [state2] = result.current;
    expect(state2.generalError).toBeNull();
    expect(state2.hasErrors).toBe(false);
  });

  it('should clear all errors', () => {
    const { result } = renderHook(() => useFormErrors());
    const [, actions] = result.current;

    act(() => {
      actions.setFieldError('email', 'Invalid email');
      actions.setFieldError('password', 'Too short');
      actions.setGeneralError(new Error('General error'));
    });

    act(() => {
      actions.clearAllErrors();
    });

    const [state] = result.current;
    expect(state.fieldErrors).toEqual({});
    expect(state.generalError).toBeNull();
    expect(state.hasErrors).toBe(false);
  });
});

describe('useErrorToasts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with no toasts', () => {
    const { result } = renderHook(() => useErrorToasts());

    expect(result.current.toasts).toEqual([]);
  });

  it('should show toast when showToast is called', () => {
    const { result } = renderHook(() => useErrorToasts());

    const testError: AppError = {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network failed',
      retryable: true
    };

    act(() => {
      result.current.showToast(testError);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].error).toEqual(testError);
    expect(result.current.toasts[0].id).toBeDefined();
    expect(result.current.toasts[0].timestamp).toBeInstanceOf(Date);
  });

  it('should remove toast when removeToast is called', () => {
    const { result } = renderHook(() => useErrorToasts());

    const testError: AppError = {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network failed',
      retryable: true
    };

    act(() => {
      result.current.showToast(testError);
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should auto-remove toast after timeout', () => {
    const { result } = renderHook(() => useErrorToasts());

    const testError: AppError = {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network failed',
      retryable: true
    };

    act(() => {
      result.current.showToast(testError);
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should clear all toasts', () => {
    const { result } = renderHook(() => useErrorToasts());

    const testError1: AppError = {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network failed',
      retryable: true
    };

    const testError2: AppError = {
      type: ErrorType.API_RATE_LIMIT,
      message: 'Rate limit exceeded',
      retryable: true
    };

    act(() => {
      result.current.showToast(testError1);
      result.current.showToast(testError2);
    });

    expect(result.current.toasts).toHaveLength(2);

    act(() => {
      result.current.clearAllToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});