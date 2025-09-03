import { PDFTemplateService, DEFAULT_TEMPLATE_CONFIG } from '../pdfTemplate';
import type { CoverLetterData } from '../../types';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    text: jest.fn(),
    setLineWidth: jest.fn(),
    line: jest.fn(),
    splitTextToSize: jest.fn().mockReturnValue(['Mock line 1', 'Mock line 2']),
    getTextWidth: jest.fn().mockReturnValue(50),
    addPage: jest.fn(),
    save: jest.fn()
  }));
});

describe('PDFTemplateService', () => {
  let service: PDFTemplateService;
  let mockCoverLetterData: CoverLetterData;

  beforeEach(() => {
    service = new PDFTemplateService();
    mockCoverLetterData = {
      id: 'test-id',
      content: 'This is a test cover letter content with multiple paragraphs.\n\nThis is the second paragraph.',
      metadata: {
        jobPosition: 'Software Developer',
        company: 'Tech Company',
        hiringManager: 'John Smith',
        location: 'San Francisco, CA',
        generatedAt: new Date('2024-01-15')
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config.applicantName).toBe(DEFAULT_TEMPLATE_CONFIG.applicantName);
      expect(config.applicantTitle).toBe(DEFAULT_TEMPLATE_CONFIG.applicantTitle);
    });

    it('should accept custom config', () => {
      const customService = new PDFTemplateService({
        applicantName: 'CUSTOM NAME',
        applicantTitle: 'Custom Title'
      });

      const config = customService.getConfig();
      expect(config.applicantName).toBe('CUSTOM NAME');
      expect(config.applicantTitle).toBe('Custom Title');
    });
  });

  describe('generatePDF', () => {
    it('should generate PDF without throwing errors', async () => {
      await expect(service.generatePDF(mockCoverLetterData)).resolves.not.toThrow();
    });

    it('should handle custom config', async () => {
      const customConfig = {
        applicantName: 'TEST USER',
        applicantTitle: 'Test Position'
      };

      await expect(
        service.generatePDF(mockCoverLetterData, customConfig)
      ).resolves.not.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        applicantName: 'UPDATED NAME',
        applicantTitle: 'Updated Title'
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config.applicantName).toBe('UPDATED NAME');
      expect(config.applicantTitle).toBe('Updated Title');
    });
  });

  describe('filename generation', () => {
    it('should generate proper filename with job position', () => {
      const service = new PDFTemplateService({
        applicantName: 'JOHN DOE'
      });

      // Access private method through any cast for testing
      const filename = (service as any).generateFilename(mockCoverLetterData.metadata);

      expect(filename).toBe('John Doe – Software Developer – Cover Letter.pdf');
    });

    it('should handle filename without job position', () => {
      const service = new PDFTemplateService({
        applicantName: 'JOHN DOE'
      });

      const metadataWithoutJob = {
        ...mockCoverLetterData.metadata,
        jobPosition: undefined
      };

      const filename = (service as any).generateFilename(metadataWithoutJob);

      expect(filename).toBe('John Doe – General Role – Cover Letter.pdf');
    });
  });
});