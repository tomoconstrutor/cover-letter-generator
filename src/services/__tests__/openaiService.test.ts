import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIService } from '../openaiService';
import type { CoverLetterRequest } from '../../types';
import { ErrorType } from '../../types';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  };
});

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockOpenAI: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Get the mocked OpenAI constructor
    const MockedOpenAI = vi.mocked(OpenAI);
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };
    
    // Make the constructor return our mock
    MockedOpenAI.mockImplementation(() => mockOpenAI);
    
    service = new OpenAIService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create service without API key', () => {
      const newService = new OpenAIService();
      expect(newService.isConfigured()).toBe(false);
    });

    it('should create service with API key', () => {
      const newService = new OpenAIService('test-api-key');
      expect(newService.isConfigured()).toBe(true);
    });

    it('should set API key after construction', () => {
      service.setApiKey('test-api-key');
      expect(service.isConfigured()).toBe(true);
    });

    it('should update API key', () => {
      service.setApiKey('first-key');
      expect(service.isConfigured()).toBe(true);
      
      service.setApiKey('second-key');
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('generateCoverLetter', () => {
    const validRequest: CoverLetterRequest = {
      jobDescription: 'Software Developer position at a tech company',
      jobPosition: 'Software Developer',
      company: 'Tech Corp',
      hiringManager: 'John Doe',
      location: 'San Francisco, CA'
    };

    beforeEach(() => {
      service.setApiKey('test-api-key');
    });

    it('should generate cover letter successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Dear Hiring Manager,\n\nI am writing to express my interest in the Software Developer position...'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateCoverLetter(validRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Dear Hiring Manager,\n\nI am writing to express my interest in the Software Developer position...');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional career counselor and expert cover letter writer. Generate high-quality, personalized cover letters that help job seekers stand out.'
          },
          {
            role: 'user',
            content: expect.stringContaining('Software Developer position at a tech company')
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });
    });

    it('should include optional fields in prompt', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Generated cover letter'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await service.generateCoverLetter(validRequest);

      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;

      expect(userMessage).toContain('Job Position: Software Developer');
      expect(userMessage).toContain('Company: Tech Corp');
      expect(userMessage).toContain('Hiring Manager: John Doe');
      expect(userMessage).toContain('Location: San Francisco, CA');
      expect(userMessage).toContain('Tomas Ferreira');
    });

    it('should include additional context for regeneration', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Regenerated cover letter'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const requestWithContext = {
        ...validRequest,
        additionalContext: 'Focus more on leadership experience'
      };

      await service.generateCoverLetter(requestWithContext);

      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;

      expect(userMessage).toContain('Additional context/requirements: Focus more on leadership experience');
    });

    it('should handle minimal request with only job description', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Minimal cover letter'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const minimalRequest: CoverLetterRequest = {
        jobDescription: 'Basic job description'
      };

      const result = await service.generateCoverLetter(minimalRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Minimal cover letter');
    });

    it('should fail when API key not configured', async () => {
      const unconfiguredService = new OpenAIService();
      
      const result = await unconfiguredService.generateCoverLetter(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not configured');
      expect(result.statusCode).toBe(401);
    });

    it('should fail when job description is empty', async () => {
      const invalidRequest: CoverLetterRequest = {
        jobDescription: ''
      };

      const result = await service.generateCoverLetter(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job description is required');
      expect(result.statusCode).toBe(400);
    });

    it('should fail when job description is only whitespace', async () => {
      const invalidRequest: CoverLetterRequest = {
        jobDescription: '   \n\t  '
      };

      const result = await service.generateCoverLetter(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job description is required');
      expect(result.statusCode).toBe(400);
    });

    it('should handle empty API response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateCoverLetter(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content generated from API');
      expect(result.statusCode).toBe(500);
    });

    it('should handle missing choices in API response', async () => {
      const mockResponse = {
        choices: []
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateCoverLetter(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content generated from API');
      expect(result.statusCode).toBe(500);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key');
    });

    it('should handle invalid API key error', async () => {
      const apiError = {
        error: {
          message: 'Invalid API key',
          type: 'invalid_api_key'
        },
        statusCode: 401
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const result = await service.generateCoverLetter({
        jobDescription: 'Test job'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key. Please check your OpenAI API key configuration.');
      expect(result.statusCode).toBe(401);
    });

    it('should handle rate limit error', async () => {
      const apiError = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_exceeded'
        },
        statusCode: 429
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const result = await service.generateCoverLetter({
        jobDescription: 'Test job'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded. Please wait a moment before trying again.');
      expect(result.statusCode).toBe(429);
    });

    it('should handle content policy violation', async () => {
      const apiError = {
        error: {
          message: 'Content policy violation',
          type: 'content_policy_violation'
        },
        statusCode: 400
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const result = await service.generateCoverLetter({
        jobDescription: 'Test job'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content policy violation. Please modify your job description and try again.');
      expect(result.statusCode).toBe(400);
    });

    it('should handle network errors', async () => {
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed'
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(networkError);

      const result = await service.generateCoverLetter({
        jobDescription: 'Test job'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error. Please check your internet connection and try again.');
      expect(result.statusCode).toBe(0);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'Request timeout'
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(timeoutError);

      const result = await service.generateCoverLetter({
        jobDescription: 'Test job'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout. Please try again.');
      expect(result.statusCode).toBe(408);
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');

      mockOpenAI.chat.completions.create.mockRejectedValue(genericError);

      const result = await service.generateCoverLetter({
        jobDescription: 'Test job'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error: Something went wrong');
      expect(result.statusCode).toBe(500);
    });
  });

  describe('responseToAppError', () => {
    it('should convert API key error correctly', () => {
      const response = {
        success: false,
        error: 'Invalid API key. Please check your OpenAI API key configuration.',
        statusCode: 401
      };

      const appError = OpenAIService.responseToAppError(response);

      expect(appError.type).toBe(ErrorType.API_KEY_INVALID);
      expect(appError.message).toBe('Invalid API key. Please check your OpenAI API key configuration.');
      expect(appError.code).toBe(401);
      expect(appError.retryable).toBe(false);
    });

    it('should convert rate limit error correctly', () => {
      const response = {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before trying again.',
        statusCode: 429
      };

      const appError = OpenAIService.responseToAppError(response);

      expect(appError.type).toBe(ErrorType.API_RATE_LIMIT);
      expect(appError.retryable).toBe(true);
    });

    it('should convert content policy error correctly', () => {
      const response = {
        success: false,
        error: 'Content policy violation. Please modify your job description and try again.',
        statusCode: 400
      };

      const appError = OpenAIService.responseToAppError(response);

      expect(appError.type).toBe(ErrorType.API_CONTENT_POLICY);
      expect(appError.retryable).toBe(false);
    });

    it('should convert network error correctly', () => {
      const response = {
        success: false,
        error: 'Network error. Please check your internet connection and try again.',
        statusCode: 0
      };

      const appError = OpenAIService.responseToAppError(response);

      expect(appError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(appError.retryable).toBe(true);
    });

    it('should convert generic error correctly', () => {
      const response = {
        success: false,
        error: 'Some generic error',
        statusCode: 500
      };

      const appError = OpenAIService.responseToAppError(response);

      expect(appError.type).toBe(ErrorType.API_GENERAL_ERROR);
      expect(appError.retryable).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      service.setApiKey('test-api-key');
      
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test cover letter'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should fail connection test when not configured', async () => {
      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not configured');
      expect(result.statusCode).toBe(401);
    });

    it('should fail connection test on API error', async () => {
      service.setApiKey('invalid-key');
      
      const apiError = {
        error: {
          message: 'Invalid API key',
          type: 'invalid_api_key'
        },
        statusCode: 401
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key. Please check your OpenAI API key configuration.');
      expect(result.statusCode).toBe(401);
    });
  });
});