// Core application interfaces and types

/**
 * Supported languages for cover letter generation
 */
export enum Language {
  ENGLISH = 'english',
  PORTUGUESE = 'portuguese'
}

/**
 * Request structure for cover letter generation
 * Used when sending data to OpenAI API
 */
export interface CoverLetterRequest {
  jobDescription: string; // required field
  hiringManager?: string; // optional
  location?: string; // optional
  jobPosition?: string; // optional
  company?: string; // optional
  additionalContext?: string; // optional, used for regeneration
  language?: Language; // optional, defaults to English
  currentLetterContent?: string; // optional, used when regenerating from existing letter
  useCurrentLetter?: boolean; // optional, flag to use current letter as base
}

/**
 * Main application state structure
 * Manages all form inputs, generated content, and UI state
 */
export interface AppState {
  // Form inputs
  jobDescription: string;
  hiringManager: string;
  location: string;
  jobPosition: string;
  company: string;
  language: Language;
  
  // Generated content and UI state
  generatedLetters: CoverLetterData[];
  selectedLetterId: string | null;
  isLoading: boolean;
  error: AppError | null;
  
  // Configuration
  apiKey: string;
  
  // Modal state
  isRegenerateModalOpen: boolean;
}

/**
 * Structure for storing generated cover letter data
 * Includes content and metadata for tracking and PDF generation
 */
export interface CoverLetterData {
  id: string;
  content: string;
  metadata: {
    jobPosition?: string;
    company?: string;
    hiringManager?: string;
    location?: string;
    generatedAt: Date;
    additionalContext?: string; // context used for regeneration
  };
}

/**
 * Configuration for PDF generation
 * Defines formatting and layout options
 */
export interface PDFConfig {
  applicantName: string;
  filename: string;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  font: {
    family: string;
    size: number;
    lineHeight: number;
  };
  pageSize: {
    width: number;
    height: number;
  };
}

/**
 * OpenAI API response structure
 * Represents the response from the cover letter generation API
 */
export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generic API response wrapper
 * Used for consistent API response handling
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// Error handling types

/**
 * Application error types
 * Categorizes different types of errors for appropriate handling
 */
export enum ErrorType {
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_CONTENT_POLICY = 'API_CONTENT_POLICY',
  API_GENERAL_ERROR = 'API_GENERAL_ERROR',
  PDF_GENERATION_ERROR = 'PDF_GENERATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Application error structure
 * Provides detailed error information for user feedback and debugging
 */
export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  code?: string | number;
  retryable: boolean;
}

/**
 * Form validation error structure
 * Used for input field validation feedback
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * API error response structure
 * Represents error responses from external APIs
 */
export interface ApiError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
  statusCode: number;
}

// Utility types

/**
 * Form field names for type safety
 * Ensures consistent field naming across components
 */
export type FormFieldName = 
  | 'jobDescription'
  | 'hiringManager' 
  | 'location'
  | 'jobPosition'
  | 'company'
  | 'language';

/**
 * Loading states for different operations
 * Provides granular loading state management
 */
export interface LoadingStates {
  generating: boolean;
  regenerating: boolean;
  downloadingPDF: boolean;
}

/**
 * Modal types for the application
 * Defines different modal dialogs that can be opened
 */
export enum ModalType {
  REGENERATE = 'REGENERATE',
  API_KEY_CONFIG = 'API_KEY_CONFIG',
  ERROR_DETAILS = 'ERROR_DETAILS'
}

/**
 * PDF generation options
 * Additional options for customizing PDF output
 */
export interface PDFGenerationOptions {
  includeDate: boolean;
  includeSignature: boolean;
  customHeader?: string;
  customFooter?: string;
}

/**
 * Retry configuration options
 * Used for configuring retry behavior in error handling
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: ErrorType[];
  onRetry?: (attempt: number, error: AppError) => void;
  onMaxAttemptsReached?: (error: AppError) => void;
}

/**
 * Event handler types for type safety
 * Ensures consistent event handling across components
 */
export type FormSubmitHandler = (data: CoverLetterRequest) => Promise<void>;
export type RegenerateHandler = (additionalContext: string, useCurrentLetter?: boolean) => Promise<void>;
export type DownloadHandler = (letterId: string) => Promise<void>;
export type ErrorHandler = (error: AppError) => void;

// Constants and defaults

/**
 * Default PDF configuration
 * Standard settings for PDF generation
 */
export const DEFAULT_PDF_CONFIG: PDFConfig = {
  applicantName: 'Tomas Ferreira',
  filename: 'cover-letter.pdf',
  margins: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20
  },
  font: {
    family: 'helvetica',
    size: 11,
    lineHeight: 1.5
  },
  pageSize: {
    width: 210, // A4 width in mm
    height: 297  // A4 height in mm
  }
};

/**
 * Default application state
 * Initial state values for the application
 */
export const DEFAULT_APP_STATE: AppState = {
  jobDescription: '',
  hiringManager: '',
  location: '',
  jobPosition: '',
  company: '',
  language: Language.ENGLISH,
  generatedLetters: [],
  selectedLetterId: null,
  isLoading: false,
  error: null,
  apiKey: '',
  isRegenerateModalOpen: false
};