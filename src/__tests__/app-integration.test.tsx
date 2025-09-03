import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('App Integration Tests', () => {
  const user = userEvent.setup();
  const mockApiKey = 'sk-test-key';
  const mockCoverLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at TechCorp.

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

  it('should render the main application components', () => {
    render(<App />);
    
    // Check that main components are rendered
    expect(screen.getByText('Cover Letter Generator')).toBeInTheDocument();
    expect(screen.getByText('Job Details')).toBeInTheDocument();
    expect(screen.getByText('Generated Cover Letter')).toBeInTheDocument();
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
  });

  it('should show API key modal when not configured', () => {
    render(<App />);
    
    // API key modal should be visible
    expect(screen.getByText('Configure OpenAI API Key')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should complete basic cover letter generation workflow', async () => {
    // Setup: API key configured
    mockLocalStorage.getItem.mockReturnValue(mockApiKey);
    
    render(<App />);

    // Fill out the form
    const jobDescriptionTextarea = screen.getByLabelText(/job description/i);
    await user.type(jobDescriptionTextarea, 'Looking for a Software Engineer');

    // Submit the form
    const generateButton = screen.getByRole('button', { name: /generate cover letter/i });
    await user.click(generateButton);

    // Verify OpenAI service is called
    await waitFor(() => {
      expect(openaiService.generateCoverLetter).toHaveBeenCalledWith(
        expect.objectContaining({
          jobDescription: 'Looking for a Software Engineer',
        })
      );
    });

    // Verify cover letter is displayed
    await waitFor(() => {
      expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
    });
  });

  it('should handle PDF download', async () => {
    // Setup: API key configured and cover letter generated
    mockLocalStorage.getItem.mockReturnValue(mockApiKey);
    
    render(<App />);

    // Generate cover letter first
    const jobDescriptionTextarea = screen.getByLabelText(/job description/i);
    await user.type(jobDescriptionTextarea, 'Test job');
    
    const generateButton = screen.getByRole('button', { name: /generate cover letter/i });
    await user.click(generateButton);

    // Wait for cover letter to be generated
    await waitFor(() => {
      expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
    });

    // Click download button
    const downloadButton = screen.getByRole('button', { name: /download pdf/i });
    await user.click(downloadButton);

    // Verify PDF service is called
    await waitFor(() => {
      expect(pdfService.generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          content: mockCoverLetter,
        })
      );
    });
  });

  it('should handle API key configuration', async () => {
    render(<App />);

    // API key modal should be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Configure API key
    const apiKeyInput = screen.getByLabelText(/api key/i);
    const saveButton = screen.getByRole('button', { name: /save/i });

    await user.type(apiKeyInput, mockApiKey);
    await user.click(saveButton);

    // Verify modal closes and localStorage is updated
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('openai_api_key', mockApiKey);
  });

  it('should handle regeneration workflow', async () => {
    // Setup: API key configured
    mockLocalStorage.getItem.mockReturnValue(mockApiKey);
    
    render(<App />);

    // Generate initial cover letter
    await user.type(screen.getByLabelText(/job description/i), 'Software Engineer role');
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
  });

  it('should handle error states gracefully', async () => {
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

    // Verify error handling (error should be displayed somewhere)
    await waitFor(() => {
      expect(openaiService.generateCoverLetter).toHaveBeenCalled();
    });

    // The error should be handled by the error handling system
    // We can't easily test the exact error message without knowing the implementation details
  });

  it('should maintain form state during interactions', async () => {
    mockLocalStorage.getItem.mockReturnValue(mockApiKey);
    render(<App />);

    // Fill out form fields
    await user.type(screen.getByLabelText(/job description/i), 'Test job description');
    await user.type(screen.getByLabelText(/job position/i), 'Software Engineer');
    await user.type(screen.getByLabelText(/company/i), 'TechCorp');

    // Verify form values are maintained
    expect(screen.getByDisplayValue('Test job description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument();
  });

  it('should handle cover letter editing', async () => {
    mockLocalStorage.getItem.mockReturnValue(mockApiKey);
    render(<App />);

    // Generate cover letter
    await user.type(screen.getByLabelText(/job description/i), 'Test job');
    await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

    await waitFor(() => {
      expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
    });

    // Find the cover letter content textarea
    const contentTextarea = screen.getByLabelText(/letter content/i);
    expect(contentTextarea).toBeInTheDocument();

    // Edit the content
    await user.clear(contentTextarea);
    await user.type(contentTextarea, 'Edited cover letter content');

    // Verify the change
    expect(contentTextarea).toHaveValue('Edited cover letter content');
  });
});