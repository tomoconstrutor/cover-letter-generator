import React, { useState, useEffect } from 'react';
import type { CoverLetterData, AppError, DownloadHandler } from '../types';

interface CoverLetterDisplayProps {
  letters: CoverLetterData[];
  selectedLetterId: string | null;
  isLoading?: boolean;
  error?: AppError | null;
  onRegenerateClick: () => void;
  onDownload: DownloadHandler;
  onLetterChange: (letterId: string, newContent: string) => void;
  onLetterSelect: (letterId: string) => void;
}

export const CoverLetterDisplay: React.FC<CoverLetterDisplayProps> = ({
  letters,
  selectedLetterId,
  isLoading = false,
  error = null,
  onRegenerateClick,
  onDownload,
  onLetterChange,
  onLetterSelect
}) => {
  const [localContent, setLocalContent] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const selectedLetter = letters.find(letter => letter.id === selectedLetterId);

  // Update local content when selected letter changes
  useEffect(() => {
    if (selectedLetter) {
      setLocalContent(selectedLetter.content);
    } else {
      setLocalContent('');
    }
  }, [selectedLetter]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    
    if (selectedLetterId) {
      onLetterChange(selectedLetterId, newContent);
    }
  };

  const handleDownload = async () => {
    if (!selectedLetterId) return;
    
    setIsDownloading(true);
    try {
      await onDownload(selectedLetterId);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Show empty state if no letters
  if (letters.length === 0 && !isLoading && !error) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 sm:p-12 text-center">
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-full p-4 w-20 h-20 mx-auto mb-6 shadow-sm">
            <svg 
              className="w-12 h-12 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to create your cover letter</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Fill out the job details on the left and click "Generate Cover Letter" to create a personalized cover letter tailored to your job application.
          </p>
          <div className="mt-6 flex items-center justify-center text-xs text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Powered by AI
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5 text-red-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error generating cover letter
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error.message}</p>
                {error.details && (
                  <p className="mt-1 text-xs text-red-600">{error.details}</p>
                )}
              </div>
              {error.retryable && (
                <div className="mt-3">
                  <button
                    onClick={onRegenerateClick}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Letter Version Selector */}
      {letters.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
              <svg className="w-4 h-4 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Cover Letter Versions
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {letters.length} versions
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {letters.map((letter, index) => (
              <button
                key={letter.id}
                onClick={() => onLetterSelect(letter.id)}
                className={`
                  w-full text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-sm
                  ${selectedLetterId === letter.id
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="font-medium text-sm">
                        Version {letters.length - index}
                      </span>
                      {selectedLetterId === letter.id && (
                        <span className="ml-2 inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Active
                        </span>
                      )}
                      {index === 0 && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(letter.metadata.generatedAt)}
                    </p>
                    {letter.metadata.additionalContext && (
                      <p className="text-xs text-gray-600 mt-1 italic truncate">
                        Context: "{letter.metadata.additionalContext.substring(0, 40)}..."
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {selectedLetterId === letter.id ? (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 sm:p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="relative mb-6">
              {/* Animated circles */}
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
              
              {/* Main spinner */}
              <div className="relative">
                <svg 
                  className="animate-spin h-12 w-12 text-blue-600 mx-auto" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                
                {/* Pulsing background */}
                <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Crafting your cover letter...
            </h3>
            <p className="text-sm text-blue-700 leading-relaxed mb-4">
              Our AI is analyzing the job description and creating a personalized cover letter just for you.
            </p>
            
            {/* Progress steps */}
            <div className="space-y-2 text-xs text-blue-600">
              <div className="flex items-center justify-center">
                <svg className="w-3 h-3 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Analyzing job requirements
              </div>
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 mr-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Generating personalized content
              </div>
              <div className="flex items-center justify-center text-gray-400">
                <div className="w-3 h-3 mr-2 border-2 border-gray-300 rounded-full"></div>
                Finalizing your letter
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Letter Content */}
      {selectedLetter && !isLoading && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cover Letter
                </h3>
                {selectedLetter.metadata.jobPosition && (
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    <span className="font-medium">For:</span> {selectedLetter.metadata.jobPosition}
                    {selectedLetter.metadata.company && (
                      <span className="text-gray-500"> at {selectedLetter.metadata.company}</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:items-end text-xs text-gray-500">
                <span className="font-medium">Generated</span>
                <span>{formatDate(selectedLetter.metadata.generatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Editable Content */}
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="cover-letter-content" className="text-sm font-medium text-gray-700">
                  Letter Content
                </label>
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editable
                </div>
              </div>
              
              <div className="relative">
                <textarea
                  id="cover-letter-content"
                  value={localContent}
                  onChange={handleContentChange}
                  placeholder="Your cover letter will appear here..."
                  rows={18}
                  className="
                    w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm resize-vertical
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    font-serif text-sm leading-relaxed transition-all duration-200
                    disabled:bg-gray-50 disabled:text-gray-500
                  "
                  disabled={isLoading}
                />
                
                {/* Word count indicator */}
                <div className="absolute bottom-3 right-3 bg-white bg-opacity-90 text-xs text-gray-500 px-2 py-1 rounded shadow-sm">
                  {localContent.split(/\s+/).filter(word => word.length > 0).length} words
                </div>
              </div>
              
              <div className="flex items-center text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You can edit the cover letter above. Changes are saved automatically and will be included in your PDF download.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
              <button
                onClick={onRegenerateClick}
                disabled={isLoading}
                className="
                  inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm
                  text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 hover:shadow-md
                "
              >
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                Regenerate with Changes
              </button>

              <button
                onClick={handleDownload}
                disabled={isLoading || isDownloading || !localContent.trim()}
                className="
                  inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm
                  text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 
                  hover:from-green-700 hover:to-green-800 hover:shadow-lg
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400
                  transition-all duration-200 transform hover:-translate-y-0.5 active:transform-none
                "
              >
                {isDownloading ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Generating PDF...</span>
                    <div className="ml-2 flex space-x-1">
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-4 h-4 mr-2" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                      />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
            
            {/* Download info */}
            {selectedLetter.metadata.jobPosition && (
              <div className="mt-3 text-xs text-gray-500 text-center">
                PDF will be saved as: <span className="font-mono bg-gray-100 px-1 rounded">
                  Tomas_Ferreira_{selectedLetter.metadata.jobPosition.replace(/\s+/g, '_')}_{selectedLetter.metadata.company?.replace(/\s+/g, '_') || 'Company'}.pdf
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverLetterDisplay;