import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFService, pdfService, pdfUtils } from '../pdfService';
import type { CoverLetterData, PDFConfig } from '../../types';
import { DEFAULT_PDF_CONFIG } from '../../types';

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSplitTextToSize = vi.fn();
const mockAddPage = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      save: mockSave,
      text: mockText,
      setFont: mockSetFont,
      setFontSize: mockSetFontSize,
      splitTextToSize: mockSplitTextToSize,
      addPage: mockAddPage
    }))
  };
});

describe('PDFService', () => {
  let service: PDFService;
  let mockCoverLetterData: CoverLetterData;

  beforeEach(() => {
    service = new PDFService();
    mockCoverLetterData = {
      id: 'test-id',
      content: 'Dear Hiring Manager,\n\nI am writing to express my interest in the Software Engineer position at Tech Company. I believe my skills and experience make me an ideal candidate for this role.\n\nThank you for your consideration.\n\nSincerely,\nTomas Ferreira',
      metadata: {
        jobPosition: 'Software Engineer',
        company: 'Tech Company',
        hiringManager: 'John Smith',
        location: 'San Francisco, CA',
        generatedAt: new Date('2024-01-15T10:00:00Z')
      }
    };

    // Reset mocks
    vi.clearAllMocks();
    mockSplitTextToSize.mockReturnValue(['Mock line 1', 'Mock line 2']);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const service = new PDFService();
      const config = service.getConfig();
      
      expect(config).toEqual(DEFAULT_PDF_CONFIG);
    });

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<PDFConfig> = {
        applicantName: 'Custom Name',
        margins: { top: 30, bottom: 30, left: 25, right: 25 }
      };
      
      const service = new PDFService(customConfig);
      const config = service.getConfig();
      
      expect(config.applicantName).toBe('Custom Name');
      expect(config.margins.top).toBe(30);
      expect(config.font).toEqual(DEFAULT_PDF_CONFIG.font); // Should keep default font
    });
  });

  describe('generatePDF', () => {
    it('should generate PDF with complete cover letter data', async () => {
      await service.generatePDF(mockCoverLetterData);

      // Verify jsPDF constructor was called (we can't easily test the constructor args with this mock setup)
      expect(mockSave).toHaveBeenCalled();

      // Verify font settings were applied
      expect(mockSetFont).toHaveBeenCalledWith('helvetica');
      expect(mockSetFontSize).toHaveBeenCalledWith(11);

      // Verify text was added (header, date, recipient, content, signature)
      expect(mockText).toHaveBeenCalledWith('Tomas Ferreira', 20, 20); // Header
      expect(mockText).toHaveBeenCalledWith('January 15, 2024', 20, 40); // Date
      expect(mockText).toHaveBeenCalledWith('John Smith', 20, 60); // Hiring manager
      expect(mockText).toHaveBeenCalledWith('Tech Company', 20, expect.any(Number)); // Company
      expect(mockText).toHaveBeenCalledWith('San Francisco, CA', 20, expect.any(Number)); // Location

      // Verify content was processed
      expect(mockSplitTextToSize).toHaveBeenCalled();

      // Verify signature was added
      expect(mockText).toHaveBeenCalledWith('Sincerely,', 20, expect.any(Number));
      expect(mockText).toHaveBeenCalledWith('Tomas Ferreira', 20, expect.any(Number));

      // Verify PDF was saved with correct filename
      expect(mockSave).toHaveBeenCalledWith('Tomas Ferreira_Software_Engineer_Tech_Company.pdf');
    });

    it('should handle missing optional metadata gracefully', async () => {
      const minimalData: CoverLetterData = {
        id: 'test-id',
        content: 'Simple cover letter content.',
        metadata: {
          generatedAt: new Date('2024-01-15T10:00:00Z')
        }
      };

      await service.generatePDF(minimalData);

      // Should still generate PDF successfully (filename will have current date)
      expect(mockSave).toHaveBeenCalledWith(expect.stringMatching(/^Tomas Ferreira_\d{4}-\d{2}-\d{2}\.pdf$/));
      expect(mockText).toHaveBeenCalledWith('Tomas Ferreira', 20, 20); // Header should still be added
    });

    it('should apply custom config when provided', async () => {
      const customConfig: Partial<PDFConfig> = {
        applicantName: 'Custom Applicant',
        font: { family: 'times', size: 12, lineHeight: 1.6 }
      };

      await service.generatePDF(mockCoverLetterData, customConfig);

      expect(mockSetFont).toHaveBeenCalledWith('times');
      expect(mockSetFontSize).toHaveBeenCalledWith(12);
      expect(mockText).toHaveBeenCalledWith('Custom Applicant', 20, 20);
      // The custom config should affect the filename through the applicant name
      expect(mockSave).toHaveBeenCalledWith('Custom Applicant_Software_Engineer_Tech_Company.pdf');
    });

    it('should handle long content that requires multiple pages', async () => {
      // Mock splitTextToSize to return many lines
      mockSplitTextToSize.mockReturnValue(Array(100).fill('Long line of text'));

      const longContentData: CoverLetterData = {
        ...mockCoverLetterData,
        content: 'Very long content that should span multiple pages'.repeat(50)
      };

      await service.generatePDF(longContentData);

      // Should add new page when content is too long
      expect(mockAddPage).toHaveBeenCalled();
    });

    it('should throw error when PDF generation fails', async () => {
      mockSave.mockImplementationOnce(() => {
        throw new Error('PDF save failed');
      });

      await expect(service.generatePDF(mockCoverLetterData))
        .rejects.toThrow('Failed to generate PDF. Please try again.');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with job position and company', () => {
      const filename = service.generateFilename(mockCoverLetterData.metadata);
      expect(filename).toBe('Tomas Ferreira_Software_Engineer_Tech_Company.pdf');
    });

    it('should generate filename with only job position', () => {
      const metadata = {
        ...mockCoverLetterData.metadata,
        company: undefined
      };
      
      const filename = service.generateFilename(metadata);
      expect(filename).toBe('Tomas Ferreira_Software_Engineer.pdf');
    });

    it('should generate filename with only company', () => {
      const metadata = {
        ...mockCoverLetterData.metadata,
        jobPosition: undefined
      };
      
      const filename = service.generateFilename(metadata);
      expect(filename).toBe('Tomas Ferreira_Tech_Company.pdf');
    });

    it('should generate filename with timestamp when no job position or company', () => {
      const metadata = {
        ...mockCoverLetterData.metadata,
        jobPosition: undefined,
        company: undefined
      };
      
      const filename = service.generateFilename(metadata);
      expect(filename).toMatch(/^Tomas Ferreira_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should clean special characters from job position and company', () => {
      const metadata = {
        ...mockCoverLetterData.metadata,
        jobPosition: 'Senior Software Engineer (Full-Stack)',
        company: 'Tech & Innovation Co.'
      };
      
      const filename = service.generateFilename(metadata);
      expect(filename).toBe('Tomas Ferreira_Senior_Software_Engineer_FullStack_Tech_Innovation_Co.pdf');
    });

    it('should handle empty strings in job position and company', () => {
      const metadata = {
        ...mockCoverLetterData.metadata,
        jobPosition: '   ',
        company: ''
      };
      
      const filename = service.generateFilename(metadata);
      expect(filename).toMatch(/^Tomas Ferreira_\d{4}-\d{2}-\d{2}\.pdf$/);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration correctly', () => {
      const newConfig: Partial<PDFConfig> = {
        applicantName: 'Updated Name',
        margins: { top: 25, bottom: 25, left: 30, right: 30 }
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config.applicantName).toBe('Updated Name');
      expect(config.margins.top).toBe(25);
      expect(config.font).toEqual(DEFAULT_PDF_CONFIG.font); // Should preserve other settings
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });
});

describe('pdfService (default instance)', () => {
  it('should be an instance of PDFService', () => {
    expect(pdfService).toBeInstanceOf(PDFService);
  });

  it('should use default configuration', () => {
    const config = pdfService.getConfig();
    expect(config).toEqual(DEFAULT_PDF_CONFIG);
  });
});

describe('pdfUtils', () => {
  describe('generateFilename', () => {
    it('should generate filename with default applicant name', () => {
      const metadata = {
        jobPosition: 'Developer',
        company: 'Test Corp',
        generatedAt: new Date()
      };

      const filename = pdfUtils.generateFilename(metadata);
      expect(filename).toBe('Tomas Ferreira_Developer_Test_Corp.pdf');
    });

    it('should generate filename with custom applicant name', () => {
      const metadata = {
        jobPosition: 'Developer',
        company: 'Test Corp',
        generatedAt: new Date()
      };

      const filename = pdfUtils.generateFilename(metadata, 'Custom Name');
      expect(filename).toBe('Custom Name_Developer_Test_Corp.pdf');
    });

    it('should handle metadata without job position or company', () => {
      const metadata = {
        generatedAt: new Date()
      };

      const filename = pdfUtils.generateFilename(metadata);
      expect(filename).toMatch(/^Tomas Ferreira_\d{4}-\d{2}-\d{2}\.pdf$/);
    });
  });
});

describe('PDF Service Integration', () => {
  it('should handle realistic cover letter content', async () => {
    // Reset mocks for this test
    vi.clearAllMocks();
    mockSplitTextToSize.mockReturnValue(['Mock line 1', 'Mock line 2']);
    const realisticData: CoverLetterData = {
      id: 'realistic-test',
      content: `Dear Ms. Johnson,

I am writing to express my strong interest in the Senior Frontend Developer position at InnovateTech Solutions. With over 5 years of experience in React, TypeScript, and modern web development practices, I am excited about the opportunity to contribute to your team's innovative projects.

In my current role at TechCorp, I have successfully led the development of several high-impact web applications, including a customer portal that increased user engagement by 40%. My expertise in responsive design, performance optimization, and accessibility ensures that I deliver solutions that not only meet technical requirements but also provide exceptional user experiences.

I am particularly drawn to InnovateTech's commitment to cutting-edge technology and user-centered design. Your recent work on the AI-powered analytics platform aligns perfectly with my passion for creating intelligent, data-driven interfaces.

I would welcome the opportunity to discuss how my skills and enthusiasm can contribute to your team's continued success. Thank you for considering my application.

Best regards,
Tomas Ferreira`,
      metadata: {
        jobPosition: 'Senior Frontend Developer',
        company: 'InnovateTech Solutions',
        hiringManager: 'Ms. Johnson',
        location: 'Seattle, WA',
        generatedAt: new Date('2024-02-01T14:30:00Z')
      }
    };

    const testService = new PDFService();
    await testService.generatePDF(realisticData);

    // Verify the PDF generation completed successfully
    expect(mockSave).toHaveBeenCalledWith('Tomas Ferreira_Senior_Frontend_Developer_InnovateTech_Solutions.pdf');
    
    // Verify content was processed (multiple paragraphs)
    expect(mockSplitTextToSize).toHaveBeenCalledTimes(6); // 6 paragraphs
    
    // Verify all recipient information was added
    expect(mockText).toHaveBeenCalledWith('Ms. Johnson', 20, expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('InnovateTech Solutions', 20, expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('Seattle, WA', 20, expect.any(Number));
  });
});