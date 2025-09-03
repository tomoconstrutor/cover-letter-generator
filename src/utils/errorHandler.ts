import type { AppError, ApiResponse } from '../types';
import { ErrorType } from '../types';

/**
 * Centralized error handling utilities
 * Provides consistent error processing, user-friendly messages, and retry logic
 */

/**
 * Error message mappings for user-friendly display
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.API_KEY_MISSING]: 'OpenAI API key is not configured. Please add your API key to continue.',
  [ErrorType.API_KEY_INVALID]: 'The provided OpenAI API key is invalid. Please check your API key and try again.',
  [ErrorType.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection and try again.',
  [ErrorType.API_RATE_LIMIT]: 'Too many requests. Please wait a moment before trying again.',
  [ErrorType.API_CONTENT_POLICY]: 'The content violates OpenAI\'s usage policies. Please modify your input and try again.',
  [ErrorType.API_GENERAL_ERROR]: 'An error occurred while communicating with the AI service. Please try again.',
  [ErrorType.PDF_GENERATION_ERROR]: 'Failed to generate PDF. Please try again or download as text.',
  [ErrorType.VALIDATION_ERROR]: 'Please check your input and correct any errors.',
  [ErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
};

/**
 * Retry configuration for different error types
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
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
 * Enhanced error class with additional context
 */
export class EnhancedError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string | number;
  public readonly retryable: boolean;
  public readonly details?: string;
  public readonly timestamp: Date;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'EnhancedError';
    this.type = appError.type;
    this.code = appError.code;
    this.retryable = appError.retryable;
    this.details = appError.details;
    this.timestamp = new Date();
  }

  toAppError(): AppError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      details: this.details
    };
  }
}

/**
 * Error handler class with centralized error processing
 */
export class ErrorHandler {
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Process and normalize errors into AppError format
   */
  processError(error: unknown): AppError {
    // Handle EnhancedError
    if (error instanceof EnhancedError) {
      return error.toAppError();
    }

    // Handle AppError
    if (this.isAppError(error)) {
      return error;
    }

    // Handle API Response errors
    if (this.isApiResponse(error) && !error.success) {
      return this.processApiResponseError(error);
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      return this.processJavaScriptError(error);
    }

    // Handle unknown error types
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: 'An unexpected error occurred',
      details: String(error),
      retryable: true
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: AppError): string {
    return ERROR_MESSAGES[error.type] || error.message;
  }

  /**
   * Check if an error is retryable
   */
  isRetryable(error: AppError): boolean {
    return error.retryable && this.retryConfig.retryableErrors.includes(error.type);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attemptNumber: number): number {
    return this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptNumber - 1);
  }

  /**
   * Execute a function with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const processedError = this.processError(error);
        lastError = processedError;

        // Don't retry if error is not retryable or we've reached max attempts
        if (!this.isRetryable(processedError) || attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Wait before retrying
        const delay = this.calculateRetryDelay(attempt);
        console.warn(`${context} failed (attempt ${attempt}/${this.retryConfig.maxAttempts}). Retrying in ${delay}ms...`, processedError);
        await this.delay(delay);
      }
    }

    // If we get here, all retries failed
    throw new EnhancedError(lastError!);
  }

  /**
   * Log error for debugging and monitoring
   */
  logError(error: AppError, context?: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      context: context || 'unknown',
      type: error.type,
      message: error.message,
      code: error.code,
      details: error.details,
      retryable: error.retryable
    };

    console.error('Error logged:', logData);

    // In production, you might want to send this to an error reporting service
    // Example: errorReportingService.captureException(error, { extra: logData });
  }

  /**
   * Create error report for debugging
   */
  createErrorReport(error: AppError, context?: string): string {
    const report = [
      `Error Report - ${new Date().toISOString()}`,
      `Context: ${context || 'unknown'}`,
      `Type: ${error.type}`,
      `Message: ${error.message}`,
      `Code: ${error.code || 'N/A'}`,
      `Retryable: ${error.retryable}`,
      `Details: ${error.details || 'N/A'}`
    ].join('\n');

    return report;
  }

  // Private helper methods

  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error &&
      'retryable' in error
    );
  }

  private isApiResponse(error: unknown): error is ApiResponse<any> {
    return (
      typeof error === 'object' &&
      error !== null &&
      'success' in error
    );
  }

  private processApiResponseError(response: ApiResponse<any>): AppError {
    const statusCode = response.statusCode;
    const message = response.error || 'Unknown API error';

    let errorType: ErrorType;
    let retryable = false;

    switch (statusCode) {
      case 401:
        errorType = message.includes('API key') ? ErrorType.API_KEY_INVALID : ErrorType.API_KEY_MISSING;
        break;
      case 429:
        errorType = ErrorType.API_RATE_LIMIT;
        retryable = true;
        break;
      case 400:
        errorType = message.includes('content policy') ? ErrorType.API_CONTENT_POLICY : ErrorType.VALIDATION_ERROR;
        break;
      case 0:
      case 408:
        errorType = ErrorType.NETWORK_ERROR;
        retryable = true;
        break;
      default:
        errorType = ErrorType.API_GENERAL_ERROR;
        retryable = true;
        break;
    }

    return {
      type: errorType,
      message,
      code: statusCode || 500,
      retryable
    };
  }

  private processJavaScriptError(error: Error): AppError {
    // Network-related errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network connection failed',
        details: error.message,
        retryable: true
      };
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('required')) {
      return {
        type: ErrorType.VALIDATION_ERROR,
        message: error.message,
        retryable: false
      };
    }

    // Generic JavaScript error
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: error.message || 'An unexpected error occurred',
      details: error.stack,
      retryable: true
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export utility functions
export const processError = (error: unknown): AppError => errorHandler.processError(error);
export const getUserFriendlyMessage = (error: AppError): string => errorHandler.getUserFriendlyMessage(error);
export const isRetryable = (error: AppError): boolean => errorHandler.isRetryable(error);
export const withRetry = <T>(operation: () => Promise<T>, context?: string): Promise<T> => 
  errorHandler.withRetry(operation, context);