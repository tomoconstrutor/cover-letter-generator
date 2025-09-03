import { pdfTemplateService } from './pdfTemplate';
import { PERSONAL_TEMPLATE_CONFIG } from '../config/template';

/**
 * Initialize the PDF template service with personal configuration
 * Call this once when the app starts
 */
export function initializeTemplate(): void {
  pdfTemplateService.updateConfig(PERSONAL_TEMPLATE_CONFIG);
}

/**
 * Get the configured template service
 */
export function getTemplateService() {
  return pdfTemplateService;
}

// Auto-initialize when this module is imported
initializeTemplate();