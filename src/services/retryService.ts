import { errorHandler, EnhancedError } from '../utils/errorHandler';
import type { AppError, RetryOptions } from '../types';
import { ErrorType } from '../types';

/**
 * Retry service for handling failed operations with intelligent retry logic
 */

// Re-export RetryOptions for convenience
export type { RetryOptions };

export interface RetryState {
  attempt: number;
  maxAttempts: number;
  lastError: AppError | null;
  isRetrying: boolean;
  nextRetryDelay: number;
}

/**
 * Retry service class for managing retry operations
 */
export class RetryService {
  private defaultOptions: Required<Omit<RetryOptions, 'onRetry' | 'onMaxAttemptsReached'>> = {
    maxAttempts: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.API_RATE_LIMIT,
      ErrorType.API_GENERAL_ERROR,
      ErrorType.UNKNOWN_ERROR
    ]
  };

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const processedError = errorHandler.processError(error);
        lastError = processedError;

        // Check if error is retryable
        if (!this.isRetryableError(processedError, config.retryableErrors)) {
          throw new EnhancedError(processedError);
        }

        // Check if we've reached max attempts
        if (attempt === config.maxAttempts) {
          options.onMaxAttemptsReached?.(processedError);
          throw new EnhancedError(processedError);
        }

        // Calculate delay and notify about retry
        const delay = this.calculateDelay(attempt, config.baseDelay, config.backoffMultiplier);
        options.onRetry?.(attempt, processedError);

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new EnhancedError(lastError!);
  }

  /**
   * Create a retry state manager for UI components
   */
  createRetryManager<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): RetryManager<T> {
    return new RetryManager(operation, { ...this.defaultOptions, ...options });
  }

  /**
   * Check if an error type is retryable
   */
  private isRetryableError(error: AppError, retryableErrors: ErrorType[]): boolean {
    return error.retryable && retryableErrors.includes(error.type);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateDelay(attempt: number, baseDelay: number, backoffMultiplier: number): number {
    return baseDelay * Math.pow(backoffMultiplier, attempt - 1);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Retry manager for UI components
 * Provides state management and retry controls
 */
export class RetryManager<T> {
  private operation: () => Promise<T>;
  private options: Required<Omit<RetryOptions, 'onRetry' | 'onMaxAttemptsReached'>>;
  private state: RetryState;
  private retryCallbacks: RetryOptions;

  constructor(operation: () => Promise<T>, options: RetryOptions) {
    this.operation = operation;
    this.options = {
      maxAttempts: options.maxAttempts || 3,
      baseDelay: options.baseDelay || 1000,
      backoffMultiplier: options.backoffMultiplier || 2,
      retryableErrors: options.retryableErrors || [
        ErrorType.NETWORK_ERROR,
        ErrorType.API_RATE_LIMIT,
        ErrorType.API_GENERAL_ERROR,
        ErrorType.UNKNOWN_ERROR
      ]
    };
    this.retryCallbacks = {
      onRetry: options.onRetry,
      onMaxAttemptsReached: options.onMaxAttemptsReached
    };
    this.state = {
      attempt: 0,
      maxAttempts: this.options.maxAttempts,
      lastError: null,
      isRetrying: false,
      nextRetryDelay: this.options.baseDelay
    };
  }

  /**
   * Execute the operation
   */
  async execute(): Promise<T> {
    this.state.attempt = 1;
    this.state.isRetrying = false;
    this.state.lastError = null;

    try {
      return await this.operation();
    } catch (error) {
      const processedError = errorHandler.processError(error);
      this.state.lastError = processedError;
      throw new EnhancedError(processedError);
    }
  }

  /**
   * Retry the operation
   */
  async retry(): Promise<T> {
    if (!this.canRetry()) {
      throw new Error('Cannot retry: operation is not retryable or max attempts reached');
    }

    this.state.attempt++;
    this.state.isRetrying = true;
    this.state.nextRetryDelay = this.calculateDelay(this.state.attempt);

    this.retryCallbacks.onRetry?.(this.state.attempt, this.state.lastError!);

    try {
      const result = await this.operation();
      this.state.isRetrying = false;
      this.state.lastError = null;
      return result;
    } catch (error) {
      const processedError = errorHandler.processError(error);
      this.state.lastError = processedError;
      this.state.isRetrying = false;

      if (this.state.attempt >= this.state.maxAttempts) {
        this.retryCallbacks.onMaxAttemptsReached?.(processedError);
      }

      throw new EnhancedError(processedError);
    }
  }

  /**
   * Check if retry is possible
   */
  canRetry(): boolean {
    return (
      this.state.lastError !== null &&
      this.state.attempt < this.state.maxAttempts &&
      this.isRetryableError(this.state.lastError) &&
      !this.state.isRetrying
    );
  }

  /**
   * Get current retry state
   */
  getState(): Readonly<RetryState> {
    return { ...this.state };
  }

  /**
   * Reset the retry manager
   */
  reset(): void {
    this.state = {
      attempt: 0,
      maxAttempts: this.options.maxAttempts,
      lastError: null,
      isRetrying: false,
      nextRetryDelay: this.options.baseDelay
    };
  }

  /**
   * Get retry countdown (for UI display)
   */
  async getRetryCountdown(onTick?: (remainingMs: number) => void): Promise<void> {
    const delay = this.state.nextRetryDelay;
    const startTime = Date.now();

    return new Promise(resolve => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, delay - elapsed);

        onTick?.(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  private isRetryableError(error: AppError): boolean {
    return error.retryable && this.options.retryableErrors.includes(error.type);
  }

  private calculateDelay(attempt: number): number {
    return this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
  }
}

// Export singleton instance
export const retryService = new RetryService();

// Utility functions for common retry patterns
export const withRetry = <T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> => retryService.executeWithRetry(operation, options);

export const createRetryManager = <T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): RetryManager<T> => retryService.createRetryManager(operation, options);