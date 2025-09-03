import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { openaiService } from '../services/openaiService';
import { pdfService } from '../services/pdfService';
import type { OpenAIResponse, CoverLetterRequest } from '../types';

// Mock services
vi.mock('../services/openaiService');
vi.mock('../services/pdfService');

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

describe('API Integration Tests', () => {
  const user = userEvent.setup();
  const mockApiKey = 'sk-test-key-12345';

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(mockApiKey);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('OpenAI API Integration', () => {
    it('should handle successful API responses', async () => {
      const mockResponse: OpenAIResponse = {
        success: true,
        data: 'Dear Hiring Manager,\n\nI am writing to express my interest in the Software Engineer position...\n\nSincerely,\nTomas Ferreira'
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(mockResponse);

      render(<App />);

      // Fill out form
      await user.type(screen.getByLabelText(/job description/i), 'Looking for a skilled developer');
      await user.type(screen.getByLabelText(/job position/i), 'Software Engineer');
      await user.type(screen.getByLabelText(/company/i), 'TechCorp');

      // Submit form
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Verify API call
      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenCalledWith({
          jobDescription: 'Looking for a skilled developer',
          jobPosition: 'Software Engineer',
          company: 'TechCorp',
          hiringManager: '',
          location: ''
        });
      });

      // Verify response is displayed
      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
      });
    });

    it('should handle API rate limiting', async () => {
      const rateLimitResponse: OpenAIResponse = {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before trying again.',
        statusCode: 429
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(rateLimitResponse);

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      });

      // Should show retry option
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle invalid API key errors', async () => {
      const invalidKeyResponse: OpenAIResponse = {
        success: false,
        error: 'Invalid API key provided',
        statusCode: 401
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(invalidKeyResponse);

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      });

      // Should prompt for API key reconfiguration
      expect(screen.getByText(/configure openai api key/i)).toBeInTheDocument();
    });

    it('should handle content policy violations', async () => {
      const policyViolationResponse: OpenAIResponse = {
        success: false,
        error: 'Content policy violation. Please modify your job description and try again.',
        statusCode: 400
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(policyViolationResponse);

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Inappropriate content');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/content policy violation/i)).toBeInTheDocument();
      });

      // Should not show retry option for policy violations
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should handle network errors with retry mechanism', async () => {
      let callCount = 0;
      vi.mocked(openaiService.generateCoverLetter).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: false,
            error: 'Network error. Please check your internet connection and try again.',
            statusCode: 0
          });
        }
        return Promise.resolve({
          success: true,
          data: 'Successfully generated after retry'
        });
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Wait for first error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Click retry
      await user.click(screen.getByRole('button', { name: /retry/i }));

      // Wait for successful retry
      await waitFor(() => {
        expect(screen.getByText(/successfully generated after retry/i)).toBeInTheDocument();
      });

      expect(callCount).toBe(2);
    });

    it('should handle timeout errors', async () => {
      const timeoutResponse: OpenAIResponse = {
        success: false,
        error: 'Request timeout. Please try again.',
        statusCode: 408
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(timeoutResponse);

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
      });

      // Should show retry option for timeouts
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle empty API responses', async () => {
      const emptyResponse: OpenAIResponse = {
        success: false,
        error: 'No content generated from API',
        statusCode: 500
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(emptyResponse);

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/no content generated/i)).toBeInTheDocument();
      });
    });

    it('should handle API service unavailable', async () => {
      const serviceUnavailableResponse: OpenAIResponse = {
        success: false,
        error: 'Service temporarily unavailable. Please try again later.',
        statusCode: 503
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(serviceUnavailableResponse);

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/service temporarily unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Request Formatting', () => {
    it('should format request with all optional fields', async () => {
      const mockResponse: OpenAIResponse = {
        success: true,
        data: 'Generated cover letter'
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(mockResponse);

      render(<App />);

      // Fill all fields
      await user.type(screen.getByLabelText(/job description/i), 'Detailed job description');
      await user.type(screen.getByLabelText(/job position/i), 'Senior Developer');
      await user.type(screen.getByLabelText(/company/i), 'Amazing Corp');
      await user.type(screen.getByLabelText(/hiring manager/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/location/i), 'San Francisco, CA');

      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenCalledWith({
          jobDescription: 'Detailed job description',
          jobPosition: 'Senior Developer',
          company: 'Amazing Corp',
          hiringManager: 'Jane Smith',
          location: 'San Francisco, CA'
        });
      });
    });

    it('should format request with only required field', async () => {
      const mockResponse: OpenAIResponse = {
        success: true,
        data: 'Minimal cover letter'
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(mockResponse);

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Basic job description');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenCalledWith({
          jobDescription: 'Basic job description',
          jobPosition: '',
          company: '',
          hiringManager: '',
          location: ''
        });
      });
    });

    it('should include additional context for regeneration', async () => {
      const mockResponse: OpenAIResponse = {
        success: true,
        data: 'Initial cover letter'
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(mockResponse);

      render(<App />);

      // Generate initial letter
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/initial cover letter/i)).toBeInTheDocument();
      });

      // Open regenerate modal
      await user.click(screen.getByRole('button', { name: /regenerate/i }));

      // Add additional context
      await user.type(screen.getByLabelText(/additional context/i), 'Make it more technical');

      // Mock regeneration response
      const regenerateResponse: OpenAIResponse = {
        success: true,
        data: 'Technical cover letter'
      };
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(regenerateResponse);

      await user.click(screen.getByRole('button', { name: /regenerate letter/i }));

      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            additionalContext: 'Make it more technical'
          })
        );
      });
    });
  });

  describe('API Error Recovery', () => {
    it('should preserve form data during API errors', async () => {
      const errorResponse: OpenAIResponse = {
        success: false,
        error: 'API Error',
        statusCode: 500
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(errorResponse);

      render(<App />);

      // Fill form
      await user.type(screen.getByLabelText(/job description/i), 'Test job description');
      await user.type(screen.getByLabelText(/job position/i), 'Developer');

      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/api error/i)).toBeInTheDocument();
      });

      // Form data should be preserved
      expect(screen.getByDisplayValue('Test job description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Developer')).toBeInTheDocument();
    });

    it('should allow retry with same data', async () => {
      let callCount = 0;
      vi.mocked(openaiService.generateCoverLetter).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: false,
            error: 'Temporary error',
            statusCode: 500
          });
        }
        return Promise.resolve({
          success: true,
          data: 'Success after retry'
        });
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Retry test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/temporary error/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(/success after retry/i)).toBeInTheDocument();
      });

      // Should have been called twice with same data
      expect(openaiService.generateCoverLetter).toHaveBeenCalledTimes(2);
      expect(openaiService.generateCoverLetter).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({ jobDescription: 'Retry test job' })
      );
      expect(openaiService.generateCoverLetter).toHaveBeenNthCalledWith(2, 
        expect.objectContaining({ jobDescription: 'Retry test job' })
      );
    });

    it('should handle consecutive API failures', async () => {
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Persistent API error',
        statusCode: 500
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/persistent api error/i)).toBeInTheDocument();
      });

      // Retry multiple times
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /retry/i }));
        await waitFor(() => {
          expect(screen.getByText(/persistent api error/i)).toBeInTheDocument();
        });
      }

      expect(openaiService.generateCoverLetter).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Real API Simulation', () => {
    it('should handle realistic API response times', async () => {
      // Simulate realistic API delay
      vi.mocked(openaiService.generateCoverLetter).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: 'Realistic cover letter response'
          }), 1500)
        )
      );

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Should show loading state
      expect(screen.getByText(/generating/i)).toBeInTheDocument();

      // Wait for response
      await waitFor(() => {
        expect(screen.getByText(/realistic cover letter response/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle large API responses', async () => {
      const largeCoverLetter = 'Dear Hiring Manager,\n\n' + 
        'This is a very long cover letter that simulates a realistic response from the OpenAI API. '.repeat(50) +
        '\n\nSincerely,\nTomas Ferreira';

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: largeCoverLetter
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Complex job description');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        const textarea = screen.getByLabelText(/letter content/i);
        expect(textarea).toHaveValue(largeCoverLetter);
      });
    });

    it('should handle special characters in API responses', async () => {
      const specialCharacterLetter = 'Dear Hiring Manager,\n\n' +
        'I am excited about the "Senior Developer" position at TechCorp™. ' +
        'My experience with C++, .NET, and other technologies makes me a great fit. ' +
        'I have worked on projects worth $1,000,000+ and improved efficiency by 25%.\n\n' +
        'Sincerely,\nTomás Ferreira';

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: specialCharacterLetter
      });

      render(<App />);

      await user.type(screen.getByLabelText(/job description/i), 'Job with special requirements');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/techcorp™/i)).toBeInTheDocument();
        expect(screen.getByText(/\$1,000,000\+/)).toBeInTheDocument();
      });
    });
  });

  describe('API Configuration Management', () => {
    it('should handle API key changes during session', async () => {
      // Start with no API key
      mockLocalStorage.getItem.mockReturnValue(null);

      render(<App />);

      // Should show API key modal
      expect(screen.getByText(/configure openai api key/i)).toBeInTheDocument();

      // Configure API key
      await user.type(screen.getByLabelText(/api key/i), 'new-api-key');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Mock successful response with new key
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: 'Generated with new key'
      });

      // Try generating cover letter
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/generated with new key/i)).toBeInTheDocument();
      });
    });

    it('should handle API key validation', async () => {
      // Mock API key test
      vi.mocked(openaiService.testConnection).mockResolvedValue({
        success: true,
        data: true
      });

      render(<App />);

      // Configure API key
      await user.type(screen.getByLabelText(/api key/i), 'valid-key');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Should test the connection
      await waitFor(() => {
        expect(openaiService.testConnection).toHaveBeenCalled();
      });
    });
  });
});