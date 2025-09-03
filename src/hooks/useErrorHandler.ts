import { useState, useCallback, useRef } from 'react';
import type { AppError, RetryOptions } from '../types';
import { errorHandler, processError } from '../utils/errorHandler';
import { createRetryManager, type RetryManager } from '../services/retryService';

/**
 * Hook for managing error state and retry logic in React components
 */

export interface UseErrorHandlerOptions {
  logErrors?: boolean;
  showToasts?: boolean;
  retryOptions?: RetryOptions;
}

export interface ErrorHandlerState {
  error: AppError | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
}

export interface ErrorHandlerActions {
  setError: (error: unknown) => void;
  clearError: () => void;
  retry: () => Promise<void>;
  withErrorHandling: <T>(operation: () => Promise<T>) => Promise<T | null>;
  createRetryableOperation: <T>(operation: () => Promise<T>) => RetryManager<T>;
}

export const useErrorHandler = (
  options: UseErrorHandlerOptions = {}
): [ErrorHandlerState, ErrorHandlerActions] => {
  const [error, setErrorState] = useState<AppError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);
  const retryManagerRef = useRef<RetryManager<any> | null>(null);

  const setError = useCallback((errorInput: unknown) => {
    const processedError = processError(errorInput);
    setErrorState(processedError);
    setIsRetrying(false);

    if (options.logErrors !== false) {
      errorHandler.logError(processedError, 'useErrorHandler');
    }
  }, [options.logErrors]);

  const clearError = useCallback(() => {
    setErrorState(null);
    setIsRetrying(false);
    setRetryCount(0);
    lastOperationRef.current = null;
    retryManagerRef.current = null;
  }, []);

  const retry = useCallback(async () => {
    if (!error || !lastOperationRef.current) {
      return;
    }

    if (!errorHandler.isRetryable(error)) {
      console.warn('Attempted to retry non-retryable error:', error);
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      if (retryManagerRef.current) {
        await retryManagerRef.current.retry();
        clearError();
      } else {
        // Fallback to simple retry
        await lastOperationRef.current();
        clearError();
      }
    } catch (retryError) {
      setError(retryError);
    }
  }, [error, clearError, setError]);

  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    lastOperationRef.current = operation;
    clearError();

    try {
      const result = await operation();
      return result;
    } catch (operationError) {
      setError(operationError);
      return null;
    }
  }, [clearError, setError]);

  const createRetryableOperation = useCallback(<T>(
    operation: () => Promise<T>
  ): RetryManager<T> => {
    const retryManager = createRetryManager(operation, {
      ...options.retryOptions,
      onRetry: (attempt, retryError) => {
        setIsRetrying(true);
        setRetryCount(attempt);
        options.retryOptions?.onRetry?.(attempt, retryError);
      },
      onMaxAttemptsReached: (finalError) => {
        setIsRetrying(false);
        setError(finalError);
        options.retryOptions?.onMaxAttemptsReached?.(finalError);
      }
    });

    retryManagerRef.current = retryManager;
    lastOperationRef.current = operation;

    return retryManager;
  }, [options.retryOptions, setError]);

  const state: ErrorHandlerState = {
    error,
    isRetrying,
    retryCount,
    canRetry: error ? errorHandler.isRetryable(error) : false
  };

  const actions: ErrorHandlerActions = {
    setError,
    clearError,
    retry,
    withErrorHandling,
    createRetryableOperation
  };

  return [state, actions];
};

/**
 * Hook for handling form validation errors
 */
export interface UseFormErrorsOptions {
  validateOnChange?: boolean;
  clearOnSuccess?: boolean;
}

export interface FormErrorState {
  fieldErrors: Record<string, string>;
  generalError: AppError | null;
  hasErrors: boolean;
}

export interface FormErrorActions {
  setFieldError: (field: string, message: string) => void;
  clearFieldError: (field: string) => void;
  setGeneralError: (error: unknown) => void;
  clearGeneralError: () => void;
  clearAllErrors: () => void;
  validateField: (field: string, value: any, validator: (value: any) => string | null) => boolean;
}

export const useFormErrors = (
  _options: UseFormErrorsOptions = {}
): [FormErrorState, FormErrorActions] => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralErrorState] = useState<AppError | null>(null);

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setGeneralError = useCallback((error: unknown) => {
    const processedError = processError(error);
    setGeneralErrorState(processedError);
  }, []);

  const clearGeneralError = useCallback(() => {
    setGeneralErrorState(null);
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setGeneralErrorState(null);
  }, []);

  const validateField = useCallback((
    field: string,
    value: any,
    validator: (value: any) => string | null
  ): boolean => {
    const errorMessage = validator(value);
    
    if (errorMessage) {
      setFieldError(field, errorMessage);
      return false;
    } else {
      clearFieldError(field);
      return true;
    }
  }, [setFieldError, clearFieldError]);

  const state: FormErrorState = {
    fieldErrors,
    generalError,
    hasErrors: Object.keys(fieldErrors).length > 0 || generalError !== null
  };

  const actions: FormErrorActions = {
    setFieldError,
    clearFieldError,
    setGeneralError,
    clearGeneralError,
    clearAllErrors,
    validateField
  };

  return [state, actions];
};

/**
 * Hook for managing toast notifications
 */
export interface ToastNotification {
  id: string;
  error: AppError;
  timestamp: Date;
}

export const useErrorToasts = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback((error: unknown) => {
    const processedError = processError(error);
    const toast: ToastNotification = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error: processedError,
      timestamp: new Date()
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts
  };
};

// Utility hook for common error handling patterns
export const useAsyncOperation = <T>(
  operation: () => Promise<T>,
  options: UseErrorHandlerOptions = {}
) => {
  const [state, actions] = useErrorHandler(options);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    const result = await actions.withErrorHandling(operation);
    setIsLoading(false);
    
    if (result !== null) {
      setData(result);
    }
    
    return result;
  }, [operation, actions]);

  const reset = useCallback(() => {
    setData(null);
    setIsLoading(false);
    actions.clearError();
  }, [actions]);

  return {
    ...state,
    data,
    isLoading,
    execute,
    reset,
    retry: actions.retry,
    clearError: actions.clearError
  };
};