import jsPDF from 'jspdf';
import type { CoverLetterData, PDFConfig } from '../types';
import { DEFAULT_PDF_CONFIG } from '../types';
import { type TemplateConfig } from './pdfTemplate';
import { getTemplateService } from './templateInitializer';

/**
 * PDF Generation Service
 * Handles creating and downloading PDF files for cover letters
 */
export class PDFService {
  private config: PDFConfig;

  constructor(config: Partial<PDFConfig> = {}) {
    this.config = { ...DEFAULT_PDF_CONFIG, ...config };
  }

  /**
   * Generates a PDF from cover letter data using the professional template
   * @param coverLetterData - The cover letter content and metadata
   * @param customConfig - Optional custom PDF configuration
   * @param language - Optional language for date formatting
   * @param openToRelocate - Optional flag to show relocation text
   * @returns Promise<void> - Triggers download automatically
   */
  async generatePDF(
    coverLetterData: CoverLetterData,
    customConfig?: Partial<PDFConfig>,
    language?: string,
    openToRelocate?: boolean
  ): Promise<void> {
    try {
      // Use the configured professional template service
      const templateService = getTemplateService();
      await templateService.generatePDF(coverLetterData, customConfig as Partial<TemplateConfig>, language, openToRelocate);
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }

  /**
   * Generates a PDF using the legacy format (for backward compatibility)
   * @param coverLetterData - The cover letter content and metadata
   * @param customConfig - Optional custom PDF configuration
   * @returns Promise<void> - Triggers download automatically
   */
  async generateLegacyPDF(
    coverLetterData: CoverLetterData,
    customConfig?: Partial<PDFConfig>
  ): Promise<void> {
    try {
      const config = customConfig ? { ...this.config, ...customConfig } : this.config;
      
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [config.pageSize.width, config.pageSize.height]
      });

      // Set font
      doc.setFont(config.font.family);
      doc.setFontSize(config.font.size);

      // Calculate content area
      const contentWidth = config.pageSize.width - config.margins.left - config.margins.right;
      // Calculate content area dimensions
      // const contentHeight = config.pageSize.height - config.margins.top - config.margins.bottom;

      // Add header with applicant information
      this.addHeader(doc, config);

      // Add date
      this.addDate(doc, config, coverLetterData.metadata.generatedAt);

      // Add recipient information if available
      let currentY = this.addRecipientInfo(doc, config, coverLetterData.metadata);

      // Add cover letter content
      currentY = this.addCoverLetterContent(doc, config, coverLetterData.content, currentY, contentWidth);

      // Add signature section
      this.addSignature(doc, config, currentY);

      // Generate filename and download
      const filename = this.generateFilenameWithConfig(coverLetterData.metadata, config);
      doc.save(filename);

    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }

  /**
   * Adds header with applicant name and contact information
   */
  private addHeader(doc: jsPDF, config: PDFConfig): void {
    const headerY = config.margins.top;
    
    // Applicant name (larger font)
    doc.setFontSize(config.font.size + 4);
    doc.setFont(config.font.family, 'bold');
    doc.text(config.applicantName, config.margins.left, headerY);
    
    // Reset font for rest of document
    doc.setFontSize(config.font.size);
    doc.setFont(config.font.family, 'normal');
  }

  /**
   * Adds current date to the document
   */
  private addDate(doc: jsPDF, config: PDFConfig, generatedDate: Date): void {
    const dateY = config.margins.top + 20;
    const formattedDate = generatedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.text(formattedDate, config.margins.left, dateY);
  }

  /**
   * Adds recipient information if available
   * @returns The Y position after adding recipient info
   */
  private addRecipientInfo(doc: jsPDF, config: PDFConfig, metadata: CoverLetterData['metadata']): number {
    let currentY = config.margins.top + 35;
    
    if (metadata.hiringManager || metadata.company || metadata.location) {
      // Add some space before recipient info
      currentY += 5;
      
      if (metadata.hiringManager) {
        doc.text(metadata.hiringManager, config.margins.left, currentY);
        currentY += config.font.size * config.font.lineHeight * 0.35;
      }
      
      if (metadata.company) {
        doc.text(metadata.company, config.margins.left, currentY);
        currentY += config.font.size * config.font.lineHeight * 0.35;
      }
      
      if (metadata.location) {
        doc.text(metadata.location, config.margins.left, currentY);
        currentY += config.font.size * config.font.lineHeight * 0.35;
      }
      
      // Add space after recipient info
      currentY += 10;
    } else {
      // If no recipient info, just add some space
      currentY += 15;
    }
    
    return currentY;
  }

  /**
   * Adds the main cover letter content with proper text wrapping
   * @returns The Y position after adding content
   */
  private addCoverLetterContent(
    doc: jsPDF, 
    config: PDFConfig, 
    content: string, 
    startY: number, 
    contentWidth: number
  ): number {
    const lineHeight = config.font.size * config.font.lineHeight * 0.35;
    let currentY = startY;
    
    // Split content into paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    for (const paragraph of paragraphs) {
      // Split paragraph into lines that fit the page width
      const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
      
      // Check if we need a new page
      if (currentY + (lines.length * lineHeight) > config.pageSize.height - config.margins.bottom - 30) {
        doc.addPage();
        currentY = config.margins.top;
      }
      
      // Add each line
      for (const line of lines) {
        doc.text(line, config.margins.left, currentY);
        currentY += lineHeight;
      }
      
      // Add space between paragraphs
      currentY += lineHeight * 0.5;
    }
    
    return currentY;
  }

  /**
   * Adds signature section at the end
   */
  private addSignature(doc: jsPDF, config: PDFConfig, startY: number): void {
    let signatureY = startY + 20;
    
    // Ensure signature is not too close to bottom
    if (signatureY > config.pageSize.height - config.margins.bottom - 40) {
      doc.addPage();
      signatureY = config.margins.top + 20;
    }
    
    // Add closing
    doc.text('Sincerely,', config.margins.left, signatureY);
    
    // Add space for signature
    signatureY += 25;
    
    // Add printed name
    doc.text(config.applicantName, config.margins.left, signatureY);
  }

  /**
   * Generates filename based on job position and company
   * Format: "Tomas Ferreira_[jobPosition]_[Company].pdf"
   */
  generateFilename(metadata: CoverLetterData['metadata']): string {
    return this.generateFilenameWithConfig(metadata, this.config);
  }

  /**
   * Generates filename with specific config in format: "Tomas Ferreira – <Role> – Cover Letter.pdf"
   * @private
   */
  private generateFilenameWithConfig(metadata: CoverLetterData['metadata'], config: PDFConfig): string {
    // Convert name to proper case and remove accents for ATS compatibility
    const applicantName = config.applicantName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())
      .join(' ')
      .replace(/á/g, 'a')  // Replace á with a for ATS compatibility
      .replace(/Tomás/g, 'Tomas'); // Ensure Tomás becomes Tomas
    
    const jobPosition = metadata.jobPosition?.trim();
    
    if (jobPosition) {
      // Clean job position for filename (keep spaces and basic punctuation)
      const cleanJobPosition = jobPosition.replace(/[<>:"/\\|?*]/g, '');
      return `${applicantName} – ${cleanJobPosition} – Cover Letter.pdf`;
    }
    
    // Fallback if no job position - still include "Role" placeholder
    return `${applicantName} – General Role – Cover Letter.pdf`;
  }

  /**
   * Updates the PDF configuration
   */
  updateConfig(newConfig: Partial<PDFConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current PDF configuration
   */
  getConfig(): PDFConfig {
    return { ...this.config };
  }
}

// Export a default instance
export const pdfService = new PDFService();

// Export the template service for direct access
export { PDFTemplateService, type TemplateConfig } from './pdfTemplate';
export { getTemplateService } from './templateInitializer';

// Export utility functions for testing
export const pdfUtils = {
  generateFilename: (metadata: CoverLetterData['metadata'], applicantName: string = 'Tomas Ferreira'): string => {
    const service = new PDFService({ applicantName });
    return service.generateFilename(metadata);
  },
  
  // Generate filename using the new format
  generateProfessionalFilename: (metadata: CoverLetterData['metadata'], applicantName: string = 'Tomas Ferreira'): string => {
    // Convert name to proper case and remove accents for ATS compatibility
    const properName = applicantName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())
      .join(' ')
      .replace(/á/g, 'a')  // Replace á with a for ATS compatibility
      .replace(/Tomás/g, 'Tomas'); // Ensure Tomás becomes Tomas
    
    const jobPosition = metadata.jobPosition?.trim();
    
    if (jobPosition) {
      const cleanJobPosition = jobPosition.replace(/[<>:"/\\|?*]/g, '');
      return `${properName} – ${cleanJobPosition} – Cover Letter.pdf`;
    }
    
    // Fallback if no job position - still include "Role" placeholder
    return `${properName} – General Role – Cover Letter.pdf`;
  }
};