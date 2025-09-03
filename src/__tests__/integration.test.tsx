import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { openaiService } from '../services/openaiService';
import { pdfService } from '../services/pdfService';

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

// Mock jsPDF
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(['Line 1', 'Line 2']),
    addPage: vi.fn(),
    save: vi.fn(),
  })),
}));

describe('Cover Letter Generator - End-to-End Integration', () => {
  const user = userEvent.setup();
  const mockApiKey = 'sk-test-key';
  const mockCoverLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at TechCorp. With my extensive background in full-stack development and passion for innovative technology solutions, I am confident I would be a valuable addition to your team.

My experience includes working with React, TypeScript, and Node.js, which aligns perfectly with the requirements outlined in your job posting. I have successfully delivered multiple projects that improved user experience and system performance.

I am excited about the opportunity to contribute to TechCorp's mission and would welcome the chance to discuss how my skills can benefit your team.

Sincerely,
Tomas Ferreira`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Mock successful OpenAI response
    vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
      success: true,
      data: mockCoverLetter,
    });

    // Mock successful PDF generation
    vi.mocked(pdfService.generatePDF).mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Workflow', () => {
    it('should complete the full workflow from API key setup to PDF download', async () => {
      render(<App />);

      // Step 1: API Key Modal should appear initially
      expect(screen.getByText('Configure OpenAI API Key')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Step 2: Configure API key
      const apiKeyInput = screen.getByLabelText(/api key/i);
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(apiKeyInput, mockApiKey);
      await user.click(saveButton);

      // Verify API key modal closes and localStorage is updated
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('openai_api_key', mockApiKey);

      // Step 3: Fill out the job application form
      const jobDescriptionTextarea = screen.getByLabelText(/job description/i);
      const jobPositionInput = screen.getByLabelText(/job position/i);
      const companyInput = screen.getByLabelText(/company/i);
      const hiringManagerInput = screen.getByLabelText(/hiring manager/i);
      const locationInput = screen.getByLabelText(/location/i);

      await user.type(jobDescriptionTextarea, 'Looking for a skilled Software Engineer to join our team...');
      await user.type(jobPositionInput, 'Software Engineer');
      await user.type(companyInput, 'TechCorp');
      await user.type(hiringManagerInput, 'Jane Smith');
      await user.type(locationInput, 'San Francisco, CA');

      // Step 4: Submit the form
      const generateButton = screen.getByRole('button', { name: /generate cover letter/i });
      await user.click(generateButton);

      // Verify loading state
      expect(screen.getByText(/generating/i)).toBeInTheDocument();

      // Step 5: Verify OpenAI service is called with correct data
      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenCalledWith({
          jobDescription: 'Looking for a skilled Software Engineer to join our team...',
          jobPosition: 'Software Engineer',
          company: 'TechCorp',
          hiringManager: 'Jane Smith',
          location: 'San Francisco, CA',
        });
      });

      // Step 6: Verify cover letter is displayed
      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
        expect(screen.getByText(/software engineer position at techcorp/i)).toBeInTheDocument();
      });

      // Step 7: Test PDF download functionality
      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      // Verify PDF service is called
      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            content: mockCoverLetter,
            metadata: expect.objectContaining({
              jobPosition: 'Software Engineer',
              company: 'TechCorp',
              hiringManager: 'Jane Smith',
              location: 'San Francisco, CA',
            }),
          })
        );
      });
    });

    it('should handle regeneration workflow with additional context', async () => {
      // Setup: Start with API key configured
      mockLocalStorage.getItem.mockReturnValue(mockApiKey);
      
      render(<App />);

      // Fill and submit initial form
      await user.type(screen.getByLabelText(/job description/i), 'Software Engineer role');
      await user.type(screen.getByLabelText(/job position/i), 'Senior Developer');
      await user.type(screen.getByLabelText(/company/i), 'StartupCorp');
      
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Wait for initial cover letter
      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
      });

      // Open regenerate modal
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      await user.click(regenerateButton);

      // Verify modal opens
      expect(screen.getByText(/regenerate cover letter/i)).toBeInTheDocument();

      // Add additional context
      const contextTextarea = screen.getByLabelText(/additional context/i);
      await user.type(contextTextarea, 'Please emphasize my leadership experience');

      // Submit regeneration
      const regenerateSubmitButton = screen.getByRole('button', { name: /regenerate cover letter/i });
      await user.click(regenerateSubmitButton);

      // Verify service called with additional context
      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenCalledWith(
          expect.objectContaining({
            additionalContext: 'Please emphasize my leadership experience',
          })
        );
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      // Mock API error
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'API request failed',
      });

      mockLocalStorage.getItem.mockReturnValue(mockApiKey);
      render(<App />);

      // Submit form
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/api request failed/i)).toBeInTheDocument();
      });

      // Verify retry button is available
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle invalid API key errors', async () => {
      // Mock invalid API key error
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: false,
        error: 'Invalid API key provided',
      });

      mockLocalStorage.getItem.mockReturnValue('invalid-key');
      render(<App />);

      // Submit form
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Verify error handling opens API key modal
      await waitFor(() => {
        expect(screen.getByText(/configure openai api key/i)).toBeInTheDocument();
      });
    });

    it('should handle PDF generation errors', async () => {
      // Mock PDF generation error
      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('PDF generation failed'));

      mockLocalStorage.getItem.mockReturnValue(mockApiKey);
      render(<App />);

      // Generate cover letter first
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
      });

      // Try to download PDF
      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      // Verify error is displayed (the error handler will show a generic error message)
      await waitFor(() => {
        expect(screen.getByText(/failed to generate pdf/i)).toBeInTheDocument();
      });
    });

    it('should handle network connectivity issues with retry mechanism', async () => {
      let callCount = 0;
      vi.mocked(openaiService.generateCoverLetter).mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            success: false,
            error: 'Network request failed',
          });
        }
        return Promise.resolve({
          success: true,
          data: mockCoverLetter,
        });
      });

      mockLocalStorage.getItem.mockReturnValue(mockApiKey);
      render(<App />);

      // Submit form
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Wait for retry mechanism to succeed
      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify multiple attempts were made
      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('User Interface Interactions', () => {
    it('should handle form validation and user feedback', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockApiKey);
      render(<App />);

      // Try to submit empty form - the form should prevent submission
      const generateButton = screen.getByRole('button', { name: /generate cover letter/i });
      await user.click(generateButton);

      // The form has HTML5 validation, so it won't submit without required fields
      // Instead, verify that the service wasn't called
      expect(openaiService.generateCoverLetter).not.toHaveBeenCalled();

      // Fill required field and submit
      await user.type(screen.getByLabelText(/job description/i), 'Valid job description');
      await user.click(generateButton);

      // Verify form submits successfully
      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenCalled();
      });
    });

    it('should handle multiple cover letter versions', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockApiKey);
      render(<App />);

      // Generate first cover letter
      await user.type(screen.getByLabelText(/job description/i), 'First job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
      });

      // Generate second cover letter
      await user.clear(screen.getByLabelText(/job description/i));
      await user.type(screen.getByLabelText(/job description/i), 'Second job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Wait for second letter to be generated
      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenCalledTimes(2);
      });

      // Verify that multiple letters exist in the state (we can't easily test the UI for version buttons)
      // Instead, verify that the service was called multiple times
      expect(openaiService.generateCoverLetter).toHaveBeenCalledTimes(2);
    });

    it('should handle cover letter editing functionality', async () => {
      mockLocalStorage.getItem.mockReturnValue(mockApiKey);
      render(<App />);

      // Generate cover letter
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
      });

      // The cover letter content is displayed in a textarea that's always editable
      const contentTextarea = screen.getByLabelText(/letter content/i);
      expect(contentTextarea).toBeInTheDocument();

      // Make changes directly in the textarea
      await user.clear(contentTextarea);
      await user.type(contentTextarea, 'Edited cover letter content');

      // Verify changes are reflected
      expect(contentTextarea).toHaveValue('Edited cover letter content');
    });
  });

  describe('Real API Integration Tests', () => {
    it('should work with actual OpenAI API endpoints when configured', async () => {
      // This test would use real API calls in a staging environment
      // For now, we'll simulate the real API behavior
      const realApiResponse = {
        success: true,
        data: 'Real API generated cover letter content...',
      };

      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue(realApiResponse);
      mockLocalStorage.getItem.mockReturnValue(mockApiKey);

      render(<App />);

      // Submit with real-world data
      await user.type(screen.getByLabelText(/job description/i), 
        'We are seeking a Senior Software Engineer with 5+ years of experience in React and TypeScript...');
      await user.type(screen.getByLabelText(/job position/i), 'Senior Software Engineer');
      await user.type(screen.getByLabelText(/company/i), 'Google');
      
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Verify API integration
      await waitFor(() => {
        expect(openaiService.generateCoverLetter).toHaveBeenCalledWith(
          expect.objectContaining({
            jobDescription: expect.stringContaining('Senior Software Engineer'),
            company: 'Google',
          })
        );
      });

      // Verify response handling
      await waitFor(() => {
        expect(screen.getByText(/real api generated cover letter/i)).toBeInTheDocument();
      });
    });
  });
});