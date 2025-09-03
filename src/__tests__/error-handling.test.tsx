import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { openaiService } from '../services/openaiService';
import { pdfService } from '../services/pdfService';
import { retryService } from '../services/retryService';
import type { AppError } from '../types';
import { ErrorType } from '../types';

// Mock services
vi.mock('../services/openaiService');
vi.mock('../services/pdfService');
vi.mock('../services/retryService');

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

// Component that throws an error for testing ErrorBoundary
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return <div>No error</div>;
};

describe('Error Handling Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-api-key');
    
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ErrorBoundary Component', () => {
    it('should catch and display JavaScript errors', () => {
      const mockOnError = vi.fn();
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should render children normally when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should provide error recovery options', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument();
    });

    it('should handle error boundary reset', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Reset by re-rendering with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should log error details for debugging', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('ErrorDisplay Component', () => {
    it('should display API key errors with reconfiguration option', () => {
      const apiKeyError: AppError = {
        type: ErrorType.API_KEY_INVALID,
        message: 'Invalid API key provided',
        retryable: false,
        code: 401
      };

      render(
        <ErrorDisplay
          error={apiKeyError}
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /configure api key/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should display network errors with retry option', () => {
      const networkError: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network connection failed',
        retryable: true,
        code: 0
      };

      const mockOnRetry = vi.fn();

      render(
        <ErrorDisplay
          error={networkError}
          onRetry={mockOnRetry}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should display rate limit errors with wait time', () => {
      const rateLimitError: AppError = {
        type: ErrorType.API_RATE_LIMIT,
        message: 'Rate limit exceeded. Please wait before trying again.',
        retryable: true,
        code: 429,
        retryAfter: 60
      };

      render(
        <ErrorDisplay
          error={rateLimitError}
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/wait.*60.*seconds/i)).toBeInTheDocument();
    });

    it('should display content policy errors without retry', () => {
      const policyError: AppError = {
        type: ErrorType.API_CONTENT_POLICY,
        message: 'Content violates usage policies',
        retryable: false,
        code: 400
      };

      render(
        <ErrorDisplay
          error={policyError}
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText(/content violates usage policies/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
      expect(screen.getByText(/modify your input/i)).toBeInTheDocument();
    });

    it('should display general errors with retry option', () => {
      const generalError: AppError = {
        type: ErrorType.API_GENERAL_ERROR,
        message: 'An unexpected error occurred',
        retryable: true,
        code: 500,
        details: 'Internal server error'
      };

      render(
        <ErrorDisplay
          error={generalError}
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle error dismissal', async () => {
      const mockOnDismiss = vi.fn();
      const error: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Test error',
        retryable: true
      };

      render(
        <ErrorDisplay
          error={error}
          onRetry={vi.fn()}
          onDismiss={mockOnDismiss}
        />
      );

      await user.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should show error codes for debugging', () => {
      const errorWithCode: AppError = {
        type: ErrorType.API_GENERAL_ERROR,
        message: 'Server error',
        retryable: true,
        code: 500
      };

      render(
        <ErrorDisplay
          error={errorWithCode}
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
          showDebugInfo={true}
        />
      );

      expect(screen.getByText(/error code: 500/i)).toBeInTheDocument();
    });
  });

  describe('API Error Handling', () => {
    it('should handle OpenAI API authentication errors', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Invalid API key provided',
        statusCode: 401
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      });

      // Should show API key configuration modal
      expect(screen.getByText(/configure openai api key/i)).toBeInTheDocument();
    });

    it('should handle OpenAI API rate limiting with automatic retry', async () => {
      let callCount = 0;
      vi.mocked(openaiService.generateCoverLetter).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: false,
            error: 'Rate limit exceeded',
            statusCode: 429
          });
        }
        return Promise.resolve({
          success: true,
          data: 'Success after rate limit'
        });
      });

      // Mock retry service
      vi.mocked(retryService.executeWithRetry).mockImplementation(async (fn) => {
        const result1 = await fn();
        if (!result1.success) {
          // Simulate retry after delay
          return await fn();
        }
        return result1;
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/success after rate limit/i)).toBeInTheDocument();
      });

      expect(callCount).toBe(2);
    });

    it('should handle OpenAI API content policy violations', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Content policy violation',
        statusCode: 400
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Inappropriate content');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/content policy violation/i)).toBeInTheDocument();
      });

      // Should not show retry option
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should handle network connectivity issues', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Network error. Please check your internet connection.',
        statusCode: 0
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle API timeout errors', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Request timeout',
        statusCode: 408
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle server errors with retry', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('PDF Generation Error Handling', () => {
    it('should handle PDF generation failures', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: 'Test cover letter'
      });

      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('PDF generation failed'));

      render(<App />);

      // Generate cover letter first
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/test cover letter/i)).toBeInTheDocument();
      });

      // Try to download PDF
      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to generate pdf/i)).toBeInTheDocument();
      });
    });

    it('should handle browser compatibility issues for PDF', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: 'Test cover letter'
      });

      vi.mocked(pdfService.generatePDF).mockRejectedValue(
        new Error('PDF generation not supported in this browser')
      );

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/test cover letter/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(screen.getByText(/not supported in this browser/i)).toBeInTheDocument();
      });
    });

    it('should provide fallback options when PDF fails', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: 'Test cover letter content'
      });

      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('PDF failed'));

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/test cover letter content/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(screen.getByText(/copy the text/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation Error Handling', () => {
    it('should handle empty job description validation', async () => {
      render(<App />);

      // Try to submit without job description
      const submitButton = screen.getByRole('button', { name: /generate cover letter/i });
      
      // Button should be disabled
      expect(submitButton).toBeDisabled();
    });

    it('should handle whitespace-only job description', async () => {
      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), '   \n\n   ');
      
      const submitButton = screen.getByRole('button', { name: /generate cover letter/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show validation errors for required fields', async () => {
      render(<App />);

      // Submit form without required field
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should clear validation errors when user starts typing', async () => {
      render(<App />);

      // Trigger validation error
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(screen.getByLabelText(/job description/i), 'Test');

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Retry Mechanism', () => {
    it('should implement exponential backoff for retries', async () => {
      const retryDelays: number[] = [];
      vi.mocked(retryService.executeWithRetry).mockImplementation(async (fn, options) => {
        let attempts = 0;
        const maxAttempts = options?.maxAttempts || 3;
        
        while (attempts < maxAttempts) {
          const result = await fn();
          attempts++;
          
          if (result.success || attempts >= maxAttempts) {
            return result;
          }
          
          // Simulate exponential backoff
          const delay = Math.pow(2, attempts) * 1000;
          retryDelays.push(delay);
          await new Promise(resolve => setTimeout(resolve, 10)); // Short delay for test
        }
        
        return await fn();
      });

      let callCount = 0;
      vi.mocked(openaiService.generateCoverLetter).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            success: false,
            error: 'Temporary error',
            statusCode: 500
          });
        }
        return Promise.resolve({
          success: true,
          data: 'Success after retries'
        });
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/success after retries/i)).toBeInTheDocument();
      });

      expect(callCount).toBe(3);
    });

    it('should limit maximum retry attempts', async () => {
      vi.mocked(retryService.executeWithRetry).mockImplementation(async (fn, options) => {
        const maxAttempts = options?.maxAttempts || 3;
        
        for (let i = 0; i < maxAttempts; i++) {
          const result = await fn();
          if (result.success) return result;
        }
        
        return await fn(); // Final attempt
      });

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Persistent error',
        statusCode: 500
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/persistent error/i)).toBeInTheDocument();
      });

      // Should have attempted maximum retries
      expect(openaiService.generateCoverLetter).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry non-retryable errors', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Invalid API key',
        statusCode: 401
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      });

      // Should not retry authentication errors
      expect(openaiService.generateCoverLetter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery', () => {
    it('should preserve user data during error recovery', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Temporary error',
        statusCode: 500
      });

      render(<App />);

      // Fill form
      await user.type(screen.getByLabelText(/job description/i), 'Important job description');
      await user.type(screen.getByLabelText(/job position/i), 'Senior Developer');
      await user.type(screen.getByLabelText(/company/i), 'Important Company');

      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/temporary error/i)).toBeInTheDocument();
      });

      // Form data should be preserved
      expect(screen.getByDisplayValue('Important job description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Senior Developer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Important Company')).toBeInTheDocument();
    });

    it('should allow manual retry after automatic retry fails', async () => {
      let callCount = 0;
      vi.mocked(openaiService.generateCoverLetter).mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({
            success: false,
            error: 'Network error',
            statusCode: 0
          });
        }
        return Promise.resolve({
          success: true,
          data: 'Success after manual retry'
        });
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Manual retry
      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(/success after manual retry/i)).toBeInTheDocument();
      });
    });

    it('should reset error state when starting new operation', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'First error',
        statusCode: 500
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'First job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      // Mock successful response for second attempt
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: 'Second attempt success'
      });

      // Clear and try again
      await user.clear(screen.getByLabelText(/job description/i));
      await user.type(screen.getByLabelText(/job description/i), 'Second job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/second attempt success/i)).toBeInTheDocument();
      });

      // Error should be cleared
      expect(screen.queryByText(/first error/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      vi.mocked(openaiService.generateCoverLetter).mockRejectedValue(new Error('Unexpected error'));

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('error'),
          expect.any(Error)
        );
      });
    });

    it('should include error context in logs', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('PDF error'));
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: 'Test content'
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/test content/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('PDF'),
          expect.any(Error)
        );
      });
    });
  });
});