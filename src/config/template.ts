import type { TemplateConfig } from '../services/pdfTemplate';

/**
 * Personal Template Configuration
 * Update this file with your personal information for the PDF template
 */
export const PERSONAL_TEMPLATE_CONFIG: Partial<TemplateConfig> = {
  // Your full name (will be displayed in uppercase)
  applicantName: 'TOMÁS FERREIRA',
  
  // Your professional title (fallback when no job position is provided)
  applicantTitle: 'Software Developer',
  
  // Your contact information
  contactInfo: {
    phone: '+351 912602277',
    email: 'tomasgferreira@gmail.com',
    website: 'tomasferreira.pt',
    address: 'Lisbon (Open to relocate)'
  },
  
  // Optional: Customize PDF formatting
  margins: {
    top: 25,
    bottom: 25,
    left: 25,
    right: 25
  },
  
  font: {
    family: 'helvetica', // Options: 'helvetica', 'times', 'courier'
    size: 11,
    lineHeight: 1.4
  }
};

/**
 * Alternative template configurations for different use cases
 */
export const TEMPLATE_VARIANTS = {
  // Compact version with smaller margins
  compact: {
    ...PERSONAL_TEMPLATE_CONFIG,
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    },
    font: {
      family: 'helvetica',
      size: 10,
      lineHeight: 1.3
    }
  } as Partial<TemplateConfig>,
  
  // Executive version with larger fonts
  executive: {
    ...PERSONAL_TEMPLATE_CONFIG,
    margins: {
      top: 30,
      bottom: 30,
      left: 30,
      right: 30
    },
    font: {
      family: 'times',
      size: 12,
      lineHeight: 1.5
    }
  } as Partial<TemplateConfig>
};