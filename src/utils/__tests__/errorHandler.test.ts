import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler, EnhancedError, errorHandler, processError, getUserFriendlyMessage, isRetryable, withRetry } from '../errorHandler';
import type { AppError, ApiResponse } from '../../types';
import { ErrorType } from '../../types';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processError', () => {
    it('should handle EnhancedError instances', () => {
      const appError: AppError = {
        type: ErrorType.API_KEY_INVALID,
        message: 'Invalid API key',
        retryable: false
      };
      const enhancedError = new EnhancedError(appError);

      const result = handler.processError(enhancedError);

      expect(result).toEqual(appError);
    });

    it('should handle AppError objects', () => {
      const appError: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true
      };

      const result = handler.processError(appError);

      expect(result).toEqual(appError);
    });

    it('should handle API response errors', () => {
      const apiResponse: ApiResponse<string> = {
        success: false,
        error: 'Invalid API key',
        statusCode: 401
      };

      const result = handler.processError(apiResponse);

      expect(result.type).toBe(ErrorType.API_KEY_INVALID);
      expect(result.message).toBe('Invalid API key');
      expect(result.code).toBe(401);
      expect(result.retryable).toBe(false);
    });

    it('should handle JavaScript Error objects', () => {
      const jsError = new Error('fetch failed');

      const result = handler.processError(jsError);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.message).toBe('Network connection failed');
      expect(result.retryable).toBe(true);
    });

    it('should handle validation errors', () => {
      const jsError = new Error('validation failed: required field missing');

      const result = handler.processError(jsError);

      expect(result.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.message).toBe('validation failed: required field missing');
      expect(result.retryable).toBe(false);
    });

    it('should handle unknown error types', () => {
      const unknownError = 'some string error';

      const result = handler.processError(unknownError);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.details).toBe('some string error');
      expect(result.retryable).toBe(true);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly messages for known error types', () => {
      const error: AppError = {
        type: ErrorType.API_KEY_MISSING,
        message: 'API key not found',
        retryable: false
      };

      const result = handler.getUserFriendlyMessage(error);

      expect(result).toBe('OpenAI API key is not configured. Please add your API key to continue.');
    });

    it('should return original message for unknown error types', () => {
      const error: AppError = {
        type: 'CUSTOM_ERROR' as ErrorType,
        message: 'Custom error message',
        retryable: false
      };

      const result = handler.getUserFriendlyMessage(error);

      expect(result).toBe('Custom error message');
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      const error: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true
      };

      const result = handler.isRetryable(error);

      expect(result).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error: AppError = {
        type: ErrorType.API_KEY_INVALID,
        message: 'Invalid API key',
        retryable: false
      };

      const result = handler.isRetryable(error);

      expect(result).toBe(false);
    });

    it('should return false for retryable errors not in retryable list', () => {
      const customHandler = new ErrorHandler({
        retryableErrors: [ErrorType.API_RATE_LIMIT]
      });

      const error: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true
      };

      const result = customHandler.isRetryable(error);

      expect(result).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff delays', () => {
      const delay1 = handler.calculateRetryDelay(1);
      const delay2 = handler.calculateRetryDelay(2);
      const delay3 = handler.calculateRetryDelay(3);

      expect(delay1).toBe(1000); // base delay
      expect(delay2).toBe(2000); // base * 2^1
      expect(delay3).toBe(4000); // base * 2^2
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await handler.withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      // Mock delay to speed up test
      vi.spyOn(handler as any, 'delay').mockResolvedValue(undefined);

      const result = await handler.withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('validation failed'));

      await expect(handler.withRetry(operation)).rejects.toThrow(EnhancedError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('network error'));

      // Mock delay to speed up test
      vi.spyOn(handler as any, 'delay').mockResolvedValue(undefined);

      await expect(handler.withRetry(operation)).rejects.toThrow(EnhancedError);
      expect(operation).toHaveBeenCalledTimes(3); // default max attempts
    });

    it('should respect custom retry configuration', async () => {
      const customHandler = new ErrorHandler({
        maxAttempts: 2,
        baseDelay: 500
      });

      const operation = vi.fn().mockRejectedValue(new Error('network error'));

      // Mock delay to speed up test
      vi.spyOn(customHandler as any, 'delay').mockResolvedValue(undefined);

      await expect(customHandler.withRetry(operation)).rejects.toThrow(EnhancedError);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const error: AppError = {
        type: ErrorType.API_KEY_INVALID,
        message: 'Invalid API key',
        retryable: false
      };

      handler.logError(error, 'test context');

      expect(consoleSpy).toHaveBeenCalledWith('Error logged:', expect.objectContaining({
        context: 'test context',
        type: ErrorType.API_KEY_INVALID,
        message: 'Invalid API key'
      }));

      consoleSpy.mockRestore();
    });
  });

  describe('createErrorReport', () => {
    it('should create formatted error report', () => {
      const error: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Connection failed',
        code: 500,
        retryable: true,
        details: 'Network timeout'
      };

      const report = handler.createErrorReport(error, 'test operation');

      expect(report).toContain('Error Report');
      expect(report).toContain('Context: test operation');
      expect(report).toContain('Type: NETWORK_ERROR');
      expect(report).toContain('Message: Connection failed');
      expect(report).toContain('Code: 500');
      expect(report).toContain('Retryable: true');
      expect(report).toContain('Details: Network timeout');
    });
  });
});

describe('EnhancedError', () => {
  it('should create enhanced error from AppError', () => {
    const appError: AppError = {
      type: ErrorType.API_RATE_LIMIT,
      message: 'Rate limit exceeded',
      code: 429,
      retryable: true,
      details: 'Too many requests'
    };

    const enhancedError = new EnhancedError(appError);

    expect(enhancedError.name).toBe('EnhancedError');
    expect(enhancedError.message).toBe('Rate limit exceeded');
    expect(enhancedError.type).toBe(ErrorType.API_RATE_LIMIT);
    expect(enhancedError.code).toBe(429);
    expect(enhancedError.retryable).toBe(true);
    expect(enhancedError.details).toBe('Too many requests');
    expect(enhancedError.timestamp).toBeInstanceOf(Date);
  });

  it('should convert back to AppError', () => {
    const appError: AppError = {
      type: ErrorType.PDF_GENERATION_ERROR,
      message: 'PDF generation failed',
      retryable: true
    };

    const enhancedError = new EnhancedError(appError);
    const convertedBack = enhancedError.toAppError();

    expect(convertedBack).toEqual(appError);
  });
});

describe('Utility functions', () => {
  describe('processError', () => {
    it('should use singleton errorHandler', () => {
      const error = new Error('test error');
      const result = processError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe('test error');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should use singleton errorHandler', () => {
      const error: AppError = {
        type: ErrorType.API_KEY_MISSING,
        message: 'API key not found',
        retryable: false
      };

      const result = getUserFriendlyMessage(error);

      expect(result).toBe('OpenAI API key is not configured. Please add your API key to continue.');
    });
  });

  describe('isRetryable', () => {
    it('should use singleton errorHandler', () => {
      const error: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true
      };

      const result = isRetryable(error);

      expect(result).toBe(true);
    });
  });

  describe('withRetry', () => {
    it('should use singleton errorHandler', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

describe('API Response Error Processing', () => {
  it('should handle 401 API key errors', () => {
    const response: ApiResponse<string> = {
      success: false,
      error: 'Invalid API key provided',
      statusCode: 401
    };

    const result = errorHandler.processError(response);

    expect(result.type).toBe(ErrorType.API_KEY_INVALID);
    expect(result.retryable).toBe(false);
  });

  it('should handle 429 rate limit errors', () => {
    const response: ApiResponse<string> = {
      success: false,
      error: 'Rate limit exceeded',
      statusCode: 429
    };

    const result = errorHandler.processError(response);

    expect(result.type).toBe(ErrorType.API_RATE_LIMIT);
    expect(result.retryable).toBe(true);
  });

  it('should handle 400 content policy errors', () => {
    const response: ApiResponse<string> = {
      success: false,
      error: 'Content violates content policy',
      statusCode: 400
    };

    const result = errorHandler.processError(response);

    expect(result.type).toBe(ErrorType.API_CONTENT_POLICY);
    expect(result.retryable).toBe(false);
  });

  it('should handle network errors (status 0)', () => {
    const response: ApiResponse<string> = {
      success: false,
      error: 'Network error occurred',
      statusCode: 0
    };

    const result = errorHandler.processError(response);

    expect(result.type).toBe(ErrorType.NETWORK_ERROR);
    expect(result.retryable).toBe(true);
  });

  it('should handle timeout errors (status 408)', () => {
    const response: ApiResponse<string> = {
      success: false,
      error: 'Request timeout',
      statusCode: 408
    };

    const result = errorHandler.processError(response);

    expect(result.type).toBe(ErrorType.NETWORK_ERROR);
    expect(result.retryable).toBe(true);
  });

  it('should handle generic API errors', () => {
    const response: ApiResponse<string> = {
      success: false,
      error: 'Internal server error',
      statusCode: 500
    };

    const result = errorHandler.processError(response);

    expect(result.type).toBe(ErrorType.API_GENERAL_ERROR);
    expect(result.retryable).toBe(true);
  });
});