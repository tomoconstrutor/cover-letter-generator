import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { CoverLetterDisplay } from '../components/CoverLetterDisplay';
import { pdfService } from '../services/pdfService';
import { openaiService } from '../services/openaiService';
import type { CoverLetterData, PDFConfig } from '../types';

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSplitTextToSize = vi.fn();
const mockAddPage = vi.fn();

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    save: mockSave,
    text: mockText,
    setFont: mockSetFont,
    setFontSize: mockSetFontSize,
    splitTextToSize: mockSplitTextToSize,
    addPage: mockAddPage
  }))
}));

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

describe('PDF Generation Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-api-key');
    mockSplitTextToSize.mockReturnValue(['Line 1', 'Line 2']);
    
    // Mock successful OpenAI response
    vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
      success: true,
      data: 'Dear Hiring Manager,\n\nTest cover letter content.\n\nSincerely,\nTomas Ferreira'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic PDF Generation', () => {
    it('should generate PDF with complete metadata', async () => {
      const mockLetter: CoverLetterData = {
        id: 'test-letter',
        content: 'Dear Ms. Johnson,\n\nI am writing to express my interest in the Software Engineer position at TechCorp.\n\nSincerely,\nTomas Ferreira',
        metadata: {
          jobPosition: 'Software Engineer',
          company: 'TechCorp',
          hiringManager: 'Ms. Johnson',
          location: 'San Francisco, CA',
          generatedAt: new Date('2024-01-15T10:30:00Z')
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="test-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(mockLetter);
      });
    });

    it('should generate PDF with minimal metadata', async () => {
      const mockLetter: CoverLetterData = {
        id: 'minimal-letter',
        content: 'Simple cover letter content.',
        metadata: {
          generatedAt: new Date('2024-01-15T10:30:00Z')
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="minimal-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(mockLetter);
      });
    });

    it('should handle PDF generation errors gracefully', async () => {
      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('PDF generation failed'));

      const mockLetter: CoverLetterData = {
        id: 'error-letter',
        content: 'Test content',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="error-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to generate pdf/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during PDF generation', async () => {
      let resolvePDF: () => void;
      const pdfPromise = new Promise<void>((resolve) => {
        resolvePDF = resolve;
      });
      vi.mocked(pdfService.generatePDF).mockReturnValue(pdfPromise);

      const mockLetter: CoverLetterData = {
        id: 'loading-letter',
        content: 'Test content',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="loading-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      // Should show loading state
      expect(screen.getByText(/generating pdf/i)).toBeInTheDocument();
      expect(downloadButton).toBeDisabled();

      // Resolve PDF generation
      resolvePDF!();
      await waitFor(() => {
        expect(screen.queryByText(/generating pdf/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('PDF Filename Generation', () => {
    it('should generate filename with job position and company', async () => {
      const mockLetter: CoverLetterData = {
        id: 'filename-test',
        content: 'Test content',
        metadata: {
          jobPosition: 'Senior Developer',
          company: 'Amazing Corp',
          generatedAt: new Date()
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="filename-test"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              jobPosition: 'Senior Developer',
              company: 'Amazing Corp'
            })
          })
        );
      });
    });

    it('should handle special characters in filename components', async () => {
      const mockLetter: CoverLetterData = {
        id: 'special-chars',
        content: 'Test content',
        metadata: {
          jobPosition: 'Senior Software Engineer (Full-Stack)',
          company: 'Tech & Innovation Co.',
          generatedAt: new Date()
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="special-chars"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalled();
      });
    });

    it('should generate timestamp-based filename when job info is missing', async () => {
      const mockLetter: CoverLetterData = {
        id: 'no-job-info',
        content: 'Test content',
        metadata: {
          generatedAt: new Date('2024-01-15T10:30:00Z')
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="no-job-info"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              generatedAt: expect.any(Date)
            })
          })
        );
      });
    });
  });

  describe('PDF Content Formatting', () => {
    it('should handle long cover letters that span multiple pages', async () => {
      const longContent = 'Dear Hiring Manager,\n\n' + 
        'This is a very long paragraph that should test the PDF generation with multiple pages. '.repeat(100) +
        '\n\nSincerely,\nTomas Ferreira';

      const mockLetter: CoverLetterData = {
        id: 'long-letter',
        content: longContent,
        metadata: {
          jobPosition: 'Software Engineer',
          company: 'TechCorp',
          generatedAt: new Date()
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="long-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            content: longContent
          })
        );
      });
    });

    it('should handle special characters and formatting in content', async () => {
      const specialContent = 'Dear Hiring Manager,\n\n' +
        'I am excited about the "Senior Developer" position at TechCorp™. ' +
        'My experience includes:\n' +
        '• C++ programming\n' +
        '• .NET development\n' +
        '• Projects worth $1,000,000+\n' +
        '• 25% efficiency improvements\n\n' +
        'Sincerely,\nTomás Ferreira';

      const mockLetter: CoverLetterData = {
        id: 'special-content',
        content: specialContent,
        metadata: {
          jobPosition: 'Senior Developer',
          company: 'TechCorp™',
          generatedAt: new Date()
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="special-content"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            content: specialContent
          })
        );
      });
    });

    it('should handle empty or whitespace-only content', async () => {
      const mockLetter: CoverLetterData = {
        id: 'empty-content',
        content: '   \n\n   ',
        metadata: {
          generatedAt: new Date()
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="empty-content"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      
      // Should be disabled for empty content
      expect(downloadButton).toBeDisabled();
    });

    it('should preserve line breaks and paragraph structure', async () => {
      const structuredContent = 'Dear Ms. Johnson,\n\n' +
        'First paragraph with important information.\n\n' +
        'Second paragraph with more details:\n' +
        '- Point one\n' +
        '- Point two\n' +
        '- Point three\n\n' +
        'Final paragraph with conclusion.\n\n' +
        'Sincerely,\n' +
        'Tomas Ferreira';

      const mockLetter: CoverLetterData = {
        id: 'structured-content',
        content: structuredContent,
        metadata: {
          hiringManager: 'Ms. Johnson',
          generatedAt: new Date()
        }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="structured-content"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            content: structuredContent
          })
        );
      });
    });
  });

  describe('PDF Generation Integration', () => {
    it('should generate PDF from end-to-end workflow', async () => {
      render(<App />);

      // Generate cover letter
      await user.type(screen.getByLabelText(/job description/i), 'Software Engineer position');
      await user.type(screen.getByLabelText(/job position/i), 'Software Engineer');
      await user.type(screen.getByLabelText(/company/i), 'TechCorp');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      // Wait for cover letter to be generated
      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
      });

      // Download PDF
      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('Dear Hiring Manager'),
            metadata: expect.objectContaining({
              jobPosition: 'Software Engineer',
              company: 'TechCorp'
            })
          })
        );
      });
    });

    it('should generate PDF after editing cover letter content', async () => {
      render(<App />);

      // Generate initial cover letter
      await user.type(screen.getByLabelText(/job description/i), 'Test job');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/letter content/i)).toBeInTheDocument();
      });

      // Edit the content
      const textarea = screen.getByLabelText(/letter content/i);
      await user.clear(textarea);
      await user.type(textarea, 'Edited cover letter content for PDF generation test.');

      // Download PDF with edited content
      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Edited cover letter content for PDF generation test.'
          })
        );
      });
    });

    it('should generate PDF for regenerated cover letter', async () => {
      render(<App />);

      // Generate initial cover letter
      await user.type(screen.getByLabelText(/job description/i), 'Initial job description');
      await user.click(screen.getByRole('button', { name: /generate cover letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/dear hiring manager/i)).toBeInTheDocument();
      });

      // Regenerate with additional context
      await user.click(screen.getByRole('button', { name: /regenerate/i }));
      await user.type(screen.getByLabelText(/additional context/i), 'Make it more technical');

      // Mock regenerated response
      vi.mocked(openaiService.generateCoverLetter).mockResolvedValue({
        success: true,
        data: 'Technical cover letter content with advanced terminology.'
      });

      await user.click(screen.getByRole('button', { name: /regenerate letter/i }));

      await waitFor(() => {
        expect(screen.getByText(/technical cover letter content/i)).toBeInTheDocument();
      });

      // Download PDF of regenerated letter
      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('Technical cover letter content'),
            metadata: expect.objectContaining({
              additionalContext: 'Make it more technical'
            })
          })
        );
      });
    });
  });

  describe('PDF Error Handling', () => {
    it('should handle PDF service initialization errors', async () => {
      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('PDF service not available'));

      const mockLetter: CoverLetterData = {
        id: 'service-error',
        content: 'Test content',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="service-error"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(screen.getByText(/pdf service not available/i)).toBeInTheDocument();
      });
    });

    it('should handle browser compatibility issues', async () => {
      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('Browser does not support PDF generation'));

      const mockLetter: CoverLetterData = {
        id: 'browser-error',
        content: 'Test content',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="browser-error"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(screen.getByText(/browser does not support/i)).toBeInTheDocument();
      });
    });

    it('should handle memory limitations for large documents', async () => {
      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('Insufficient memory for PDF generation'));

      const largeLetter: CoverLetterData = {
        id: 'large-letter',
        content: 'Very large content. '.repeat(10000),
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[largeLetter]}
          selectedLetterId="large-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(screen.getByText(/insufficient memory/i)).toBeInTheDocument();
      });
    });

    it('should provide fallback options when PDF generation fails', async () => {
      vi.mocked(pdfService.generatePDF).mockRejectedValue(new Error('PDF generation failed'));

      const mockLetter: CoverLetterData = {
        id: 'fallback-test',
        content: 'Test content for fallback',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="fallback-test"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to generate pdf/i)).toBeInTheDocument();
      });

      // Should suggest copying text as alternative
      expect(screen.getByText(/copy the text/i)).toBeInTheDocument();
    });
  });

  describe('PDF Performance', () => {
    it('should handle concurrent PDF generation requests', async () => {
      const mockLetter: CoverLetterData = {
        id: 'concurrent-test',
        content: 'Test content',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="concurrent-test"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });

      // Click multiple times rapidly
      await user.click(downloadButton);
      await user.click(downloadButton);
      await user.click(downloadButton);

      // Should only generate one PDF (button should be disabled during generation)
      await waitFor(() => {
        expect(pdfService.generatePDF).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle PDF generation for different letter sizes efficiently', async () => {
      const sizes = ['Short content.', 'Medium length content. '.repeat(10), 'Long content. '.repeat(100)];

      for (const [index, content] of sizes.entries()) {
        const mockLetter: CoverLetterData = {
          id: `size-test-${index}`,
          content,
          metadata: { generatedAt: new Date() }
        };

        const { unmount } = render(
          <CoverLetterDisplay
            letters={[mockLetter]}
            selectedLetterId={`size-test-${index}`}
            onRegenerateClick={vi.fn()}
            onDownload={vi.fn()}
            onLetterChange={vi.fn()}
            onLetterSelect={vi.fn()}
          />
        );

        await user.click(screen.getByRole('button', { name: /download pdf/i }));

        await waitFor(() => {
          expect(pdfService.generatePDF).toHaveBeenCalledWith(
            expect.objectContaining({ content })
          );
        });

        unmount();
        vi.clearAllMocks();
      }
    });
  });
});