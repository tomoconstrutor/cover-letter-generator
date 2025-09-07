import jsPDF from 'jspdf';
import type { CoverLetterData, PDFConfig } from '../types';

/**
 * Professional PDF Template Service
 * Creates standardized cover letters with consistent formatting
 */
export interface TemplateConfig extends PDFConfig {
  applicantTitle: string;
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    address: string;
  };
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  applicantName: 'TOMÁS FERREIRA',
  applicantTitle: 'Software Developer',
  contactInfo: {
    phone: '+351 912602277',
    email: 'tomasgferreira@gmail.com',
    website: 'tomasferreira.pt',
    address: 'Lisbon'
  },
  filename: 'cover-letter.pdf',
  margins: {
    top: 25,
    bottom: 25,
    left: 25,
    right: 25
  },
  font: {
    family: 'helvetica',
    size: 11,
    lineHeight: 1.4
  },
  pageSize: {
    width: 210, // A4 width in mm
    height: 297  // A4 height in mm
  }
};

export class PDFTemplateService {
  private config: TemplateConfig;

  constructor(config: Partial<TemplateConfig> = {}) {
    this.config = { ...DEFAULT_TEMPLATE_CONFIG, ...config };
  }

  /**
   * Generates a professional PDF using the standardized template
   */
  async generatePDF(
    coverLetterData: CoverLetterData,
    customConfig?: Partial<TemplateConfig>,
    language?: string,
    openToRelocate?: boolean
  ): Promise<void> {
    try {
      const config = customConfig ? { ...this.config, ...customConfig } : this.config;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [config.pageSize.width, config.pageSize.height]
      });

      // Calculate content area
      const contentWidth = config.pageSize.width - config.margins.left - config.margins.right;

      // Add all template sections
      let currentY = this.addHeader(doc, config, coverLetterData.metadata, language, openToRelocate);
      currentY = this.addDate(doc, config, coverLetterData.metadata.generatedAt, currentY, language);
      // Skip recipient info, job reference, greeting, and closing - just content
      this.addCoverLetterContent(doc, config, coverLetterData.content, currentY, contentWidth);

      // Generate and download
      const filename = this.generateFilename(coverLetterData.metadata);
      doc.save(filename);

    } catch (error) {
      console.error('PDF template generation failed:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }

  /**
   * Creates professional header with name, title, and contact info
   */
  private addHeader(doc: jsPDF, config: TemplateConfig, metadata: CoverLetterData['metadata'], language?: string, openToRelocate?: boolean): number {
    const headerY = config.margins.top;

    // Applicant name (large, bold, uppercase)
    doc.setFont(config.font.family, 'bold');
    doc.setFontSize(24);
    doc.text(config.applicantName.toUpperCase(), config.margins.left, headerY);

    // Applicant title (smaller, normal weight) - use job position if available, otherwise fallback to config
    doc.setFont(config.font.family, 'normal');
    doc.setFontSize(14);
    const titleY = headerY + 8;
    const displayTitle = metadata.jobPosition || config.applicantTitle;
    doc.text(displayTitle, config.margins.left, titleY);

    // Contact information (right-aligned)
    doc.setFontSize(config.font.size);
    const contactStartY = headerY;
    const rightMargin = config.pageSize.width - config.margins.right;

    // Phone
    const phoneWidth = doc.getTextWidth(config.contactInfo.phone);
    doc.text(config.contactInfo.phone, rightMargin - phoneWidth, contactStartY);

    // Email
    const emailY = contactStartY + 4;
    const emailWidth = doc.getTextWidth(config.contactInfo.email);
    doc.text(config.contactInfo.email, rightMargin - emailWidth, emailY);

    // Website
    const websiteY = emailY + 4;
    const websiteWidth = doc.getTextWidth(config.contactInfo.website);
    doc.text(config.contactInfo.website, rightMargin - websiteWidth, websiteY);

    // Address (language-dependent with optional relocation text)
    const addressY = websiteY + 4;
    const isPortuguese = language === 'portuguese';
    let address: string;
    
    if (openToRelocate) {
      address = isPortuguese ? 'Lisboa (Disponível para mudança)' : 'Lisbon (Open to relocate)';
    } else {
      address = isPortuguese ? 'Lisboa' : 'Lisbon';
    }
    
    const addressWidth = doc.getTextWidth(address);
    doc.text(address, rightMargin - addressWidth, addressY);

    // Add horizontal line separator
    const lineY = titleY + 12;
    doc.setLineWidth(0.5);
    doc.line(config.margins.left, lineY, rightMargin, lineY);

    return lineY + 15;
  }

  /**
   * Adds formatted date (right-aligned) in the selected language
   */
  private addDate(doc: jsPDF, config: TemplateConfig, generatedDate: Date, startY: number, language?: string): number {
    const formattedDate = this.formatDate(generatedDate, language);
    const rightMargin = config.pageSize.width - config.margins.right;
    const dateWidth = doc.getTextWidth(formattedDate);

    doc.setFont(config.font.family, 'normal');
    doc.setFontSize(config.font.size);
    doc.text(formattedDate, rightMargin - dateWidth, startY);

    return startY + 15;
  }



  /**
   * Adds the main cover letter content with proper formatting
   */
  private addCoverLetterContent(
    doc: jsPDF,
    config: TemplateConfig,
    content: string,
    startY: number,
    contentWidth: number
  ): number {
    const lineHeight = config.font.size * config.font.lineHeight * 0.35;
    let currentY = startY;

    // Clean and split content into paragraphs
    const cleanContent = this.cleanGeneratedContent(content);
    const paragraphs = cleanContent.split('\n\n').filter(p => p.trim().length > 0);

    for (const paragraph of paragraphs) {
      // Check if we need a new page
      if (currentY > config.pageSize.height - config.margins.bottom - 50) {
        doc.addPage();
        currentY = config.margins.top;
      }

      // Split paragraph into lines that fit the page width
      const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);

      // Add each line
      for (const line of lines) {
        if (currentY > config.pageSize.height - config.margins.bottom - 30) {
          doc.addPage();
          currentY = config.margins.top;
        }

        doc.text(line, config.margins.left, currentY);
        currentY += lineHeight;
      }

      // Add space between paragraphs
      currentY += lineHeight * 0.8;
    }

    return currentY;
  }



  /**
   * Cleans generated content by removing only duplicate template elements, preserving greetings and closings
   */
  private cleanGeneratedContent(content: string): string {
    // Only remove elements that would duplicate our template structure
    let cleaned = content
      // Remove job references that duplicate our template
      .replace(/^(JOB\s+REFERENCE:\s*.*$)/im, '')
      .replace(/^(Assunto:\s*.*$)/im, '') // Portuguese subject line
      .replace(/^(Subject:\s*.*$)/im, '') // English subject line

      // Remove company/location lines that duplicate recipient info (only if they're standalone lines)
      .replace(/^([A-Za-z\s]+\s+(Paris|London|Berlin|Madrid|Lisbon|Amsterdam|Rome|Vienna|Brussels|Dublin|Stockholm|Copenhagen|Helsinki|Oslo|Zurich|Geneva|Barcelona|Milan|Prague|Warsaw|Budapest|Bucharest|Sofia|Zagreb|Ljubljana|Bratislava|Tallinn|Riga|Vilnius|Luxembourg|Monaco|Andorra|Liechtenstein|San Marino|Vatican|Malta|Cyprus)\s*$)/im, '')

      // Clean up multiple line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    return cleaned;
  }

  /**
   * Formats date in professional style based on language
   */
  private formatDate(date: Date, language?: string): string {
    const isPortuguese = language === 'portuguese';

    if (isPortuguese) {
      // Portuguese format: "15 de Janeiro de 2024"
      const day = date.getDate();
      const month = date.toLocaleDateString('pt-PT', { month: 'long' });
      const year = date.getFullYear();
      return `${day} de ${month} de ${year}`;
    } else {
      // English format: "15th January 2024"
      const day = date.getDate();
      const suffix = this.getOrdinalSuffix(day);
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${day}${suffix} ${month} ${year}`;
    }
  }

  /**
   * Gets ordinal suffix for day (1st, 2nd, 3rd, etc.)
   */
  private getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * Generates professional filename in format: "Tomas Ferreira – <Role> – Cover Letter.pdf"
   */
  private generateFilename(metadata: CoverLetterData['metadata']): string {
    // Convert name to proper case and remove accents for ATS compatibility
    const applicantName = this.config.applicantName
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
   * Updates template configuration
   */
  updateConfig(newConfig: Partial<TemplateConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current template configuration
   */
  getConfig(): TemplateConfig {
    return { ...this.config };
  }
}

// Export default instance - will be configured with personal info when imported
export const pdfTemplateService = new PDFTemplateService();