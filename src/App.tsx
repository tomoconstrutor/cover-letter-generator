import { useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InputForm } from './components/InputForm';
import { CoverLetterDisplay } from './components/CoverLetterDisplay';
import { RegenerateModal } from './components/RegenerateModal';

import { ErrorDisplay } from './components/ErrorDisplay';
import { useApiKey } from './hooks/useApiKey';
import { useErrorHandler } from './hooks/useErrorHandler';
import { openaiService, OpenAIService } from './services/openaiService';
import { pdfService } from './services/pdfService';
import { withRetry } from './utils/errorHandler';
import type { 
  AppState, 
  CoverLetterRequest, 
  CoverLetterData, 
  FormSubmitHandler,
  RegenerateHandler,
  DownloadHandler
} from './types';
import { DEFAULT_APP_STATE, Language } from './types';

/**
 * Main App Component
 * Orchestrates all child components and manages global application state
 */
function App() {
  // API key management
  const { apiKey } = useApiKey();
  
  // Error handling
  const [errorState, errorActions] = useErrorHandler({
    logErrors: true,
    retryOptions: {
      maxAttempts: 3,
      baseDelay: 1000
    }
  });
  
  // Main application state
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  


  // Initialize OpenAI service when API key changes
  useEffect(() => {
    if (apiKey) {
      openaiService.setApiKey(apiKey);
      setAppState(prev => ({ ...prev, apiKey }));
    }
  }, [apiKey]);



  /**
   * Generate a unique ID for cover letters
   */
  const generateId = (): string => {
    return `letter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Handle form submission for cover letter generation
   */
  const handleFormSubmit: FormSubmitHandler = useCallback(async (formData: CoverLetterRequest) => {

    // Clear any existing errors
    errorActions.clearError();

    setAppState(prev => ({
      ...prev,
      isLoading: true,
      // Update form data in state
      jobDescription: formData.jobDescription,
      hiringManager: formData.hiringManager || '',
      location: formData.location || '',
      jobPosition: formData.jobPosition || '',
      company: formData.company || '',
      language: formData.language || Language.ENGLISH
    }));

    const result = await errorActions.withErrorHandling(async () => {
      const response = await openaiService.generateCoverLetter(formData);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw OpenAIService.responseToAppError(response);
      }
    });

    setAppState(prev => ({ ...prev, isLoading: false }));

    if (result) {
      const newLetter: CoverLetterData = {
        id: generateId(),
        content: result,
        metadata: {
          jobPosition: formData.jobPosition,
          company: formData.company,
          hiringManager: formData.hiringManager,
          location: formData.location,
          generatedAt: new Date()
        }
      };

      setAppState(prev => ({
        ...prev,
        generatedLetters: [newLetter, ...prev.generatedLetters],
        selectedLetterId: newLetter.id
      }));
    }
  }, [errorActions]);

  /**
   * Handle cover letter regeneration with additional context
   */
  const handleRegenerate: RegenerateHandler = useCallback(async (additionalContext: string, useCurrentLetter: boolean = false) => {

    const selectedLetter = appState.generatedLetters.find(l => l.id === appState.selectedLetterId);
    
    const formData: CoverLetterRequest = {
      jobDescription: appState.jobDescription,
      hiringManager: appState.hiringManager,
      location: appState.location,
      jobPosition: appState.jobPosition,
      company: appState.company,
      language: appState.language,
      additionalContext,
      useCurrentLetter,
      currentLetterContent: useCurrentLetter ? selectedLetter?.content : undefined
    };

    // Clear any existing errors
    errorActions.clearError();

    setAppState(prev => ({
      ...prev,
      isLoading: true,
      isRegenerateModalOpen: false
    }));

    const result = await errorActions.withErrorHandling(async () => {
      const response = await openaiService.generateCoverLetter(formData);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw OpenAIService.responseToAppError(response);
      }
    });

    setAppState(prev => ({ ...prev, isLoading: false }));

    if (result) {
      const newLetter: CoverLetterData = {
        id: generateId(),
        content: result,
        metadata: {
          jobPosition: formData.jobPosition,
          company: formData.company,
          hiringManager: formData.hiringManager,
          location: formData.location,
          generatedAt: new Date(),
          additionalContext
        }
      };

      setAppState(prev => ({
        ...prev,
        generatedLetters: [newLetter, ...prev.generatedLetters],
        selectedLetterId: newLetter.id
      }));
    }
  }, [appState.jobDescription, appState.hiringManager, appState.location, appState.jobPosition, appState.company, appState.language, appState.generatedLetters, appState.selectedLetterId, errorActions]);

  /**
   * Handle PDF download with retry logic
   */
  const handleDownload: DownloadHandler = useCallback(async (letterId: string) => {
    const letter = appState.generatedLetters.find(l => l.id === letterId);
    if (!letter) return;

    await errorActions.withErrorHandling(async () => {
      await withRetry(
        () => pdfService.generatePDF(letter, undefined, appState.language),
        'PDF generation'
      );
    });
  }, [appState.generatedLetters, appState.language, errorActions]);

  /**
   * Handle letter content changes
   */
  const handleLetterChange = useCallback((letterId: string, newContent: string) => {
    setAppState(prev => ({
      ...prev,
      generatedLetters: prev.generatedLetters.map(letter =>
        letter.id === letterId
          ? { ...letter, content: newContent }
          : letter
      )
    }));
  }, []);

  /**
   * Handle letter selection
   */
  const handleLetterSelect = useCallback((letterId: string) => {
    setAppState(prev => ({
      ...prev,
      selectedLetterId: letterId
    }));
  }, []);

  /**
   * Handle opening regenerate modal
   */
  const handleRegenerateClick = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      isRegenerateModalOpen: true
    }));
  }, []);

  /**
   * Handle closing regenerate modal
   */
  const handleRegenerateModalClose = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      isRegenerateModalOpen: false
    }));
  }, []);



  /**
   * Handle retry for failed operations
   */
  const handleRetry = useCallback(async () => {
    if (!errorState.error) return;

    // For retryable errors, use the retry mechanism
    if (errorState.canRetry) {
      await errorActions.retry();
    }
  }, [errorState.error, errorState.canRetry, errorActions]);

  /**
   * Get current form data for InputForm
   */
  const getCurrentFormData = (): Partial<CoverLetterRequest> => ({
    jobDescription: appState.jobDescription,
    hiringManager: appState.hiringManager,
    location: appState.location,
    jobPosition: appState.jobPosition,
    company: appState.company,
    language: appState.language
  });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  Cover Letter Generator
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Generate personalized cover letters with AI
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                <span className="text-sm text-gray-600 font-medium">
                  API Connected
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            {/* Input Form */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Job Details
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Provide job information to generate your cover letter
                  </p>
                </div>
                <div className="p-6">
                  <InputForm
                    onSubmit={handleFormSubmit}
                    isLoading={appState.isLoading}
                    initialData={getCurrentFormData()}
                  />
                </div>
              </div>
            </div>

            {/* Cover Letter Display */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Generated Cover Letter
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Review and edit your personalized cover letter
                  </p>
                </div>
                <div className="p-6">
                  <CoverLetterDisplay
                    letters={appState.generatedLetters}
                    selectedLetterId={appState.selectedLetterId}
                    isLoading={appState.isLoading || errorState.isRetrying}
                    error={errorState.error}
                    onRegenerateClick={handleRegenerateClick}
                    onDownload={handleDownload}
                    onLetterChange={handleLetterChange}
                    onLetterSelect={handleLetterSelect}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {errorState.error && (
            <div className="mt-6">
              <ErrorDisplay
                error={errorState.error}
                onRetry={errorState.canRetry ? handleRetry : undefined}
                onDismiss={errorActions.clearError}
                showDetails={true}
              />
            </div>
          )}

          {/* Retry Status */}
          {errorState.isRetrying && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">
                    Retrying operation... (Attempt {errorState.retryCount + 1})
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Please wait while we process your request
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Modals */}
        <RegenerateModal
          isOpen={appState.isRegenerateModalOpen}
          onClose={handleRegenerateModalClose}
          onRegenerate={handleRegenerate}
          isLoading={appState.isLoading}
          currentLetterContent={appState.generatedLetters.find(l => l.id === appState.selectedLetterId)?.content}
        />


      </div>
    </ErrorBoundary>
  );
}

export default App;
