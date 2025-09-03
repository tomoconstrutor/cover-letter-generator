import React, { useState } from 'react';
import type { AppError } from '../types';
import { ErrorType } from '../types';
import { getUserFriendlyMessage, isRetryable, errorHandler } from '../utils/errorHandler';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

/**
 * Reusable error display component
 * Shows user-friendly error messages with appropriate actions
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}) => {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const userFriendlyMessage = getUserFriendlyMessage(error);
  const canRetry = isRetryable(error) && onRetry;

  const getErrorIcon = () => {
    switch (error.type) {
      case ErrorType.API_KEY_MISSING:
      case ErrorType.API_KEY_INVALID:
        return (
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case ErrorType.NETWORK_ERROR:
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case ErrorType.API_RATE_LIMIT:
        return (
          <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case ErrorType.API_KEY_MISSING:
      case ErrorType.API_KEY_INVALID:
        return 'yellow';
      case ErrorType.API_RATE_LIMIT:
        return 'orange';
      default:
        return 'red';
    }
  };

  const color = getErrorColor();

  const handleReportError = async () => {
    setIsReporting(true);
    try {
      const report = errorHandler.createErrorReport(error, 'User reported error');
      
      // Copy to clipboard
      await navigator.clipboard.writeText(report);
      
      // Log for debugging
      errorHandler.logError(error, 'User reported error');
      
      alert('Error report copied to clipboard. You can share this with support.');
    } catch (clipboardError) {
      console.error('Failed to copy error report:', clipboardError);
      alert('Error report generated. Check console for details.');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium text-${color}-800`}>
            {error.type === ErrorType.API_KEY_MISSING || error.type === ErrorType.API_KEY_INVALID
              ? 'Configuration Required'
              : 'Error'
            }
          </h3>
          <div className={`mt-2 text-sm text-${color}-700`}>
            <p>{userFriendlyMessage}</p>
            
            {/* Additional context for specific error types */}
            {error.type === ErrorType.API_RATE_LIMIT && (
              <p className="mt-1 text-xs">
                You can get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI's website</a>.
              </p>
            )}
            
            {error.type === ErrorType.API_CONTENT_POLICY && (
              <p className="mt-1 text-xs">
                Try rephrasing your job description or removing any potentially sensitive content.
              </p>
            )}
          </div>

          {/* Error details */}
          {(showDetails || error.details) && (
            <div className="mt-3">
              <button
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className={`text-xs text-${color}-600 hover:text-${color}-800 font-medium flex items-center`}
              >
                <span>{isDetailsExpanded ? 'Hide' : 'Show'} technical details</span>
                <svg 
                  className={`ml-1 h-3 w-3 transform transition-transform ${isDetailsExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isDetailsExpanded && (
                <div className={`mt-2 p-2 bg-${color}-100 rounded text-xs font-mono text-${color}-800 overflow-auto max-h-32`}>
                  <div><strong>Error Type:</strong> {error.type}</div>
                  {error.code && <div><strong>Code:</strong> {error.code}</div>}
                  {error.details && <div><strong>Details:</strong> {error.details}</div>}
                  <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
                  <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {canRetry && (
              <button
                onClick={onRetry}
                className={`text-sm bg-${color}-100 text-${color}-800 px-3 py-1 rounded-md hover:bg-${color}-200 transition-colors font-medium`}
              >
                Try Again
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-sm text-${color}-600 hover:text-${color}-800 px-3 py-1 rounded-md transition-colors`}
              >
                Dismiss
              </button>
            )}
            
            <button
              onClick={handleReportError}
              disabled={isReporting}
              className={`text-sm text-${color}-600 hover:text-${color}-800 px-3 py-1 rounded-md transition-colors disabled:opacity-50`}
            >
              {isReporting ? 'Copying...' : 'Copy Error Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Inline error display for form fields
 */
interface InlineErrorProps {
  message: string;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, className = '' }) => (
  <div className={`flex items-center mt-1 text-sm text-red-600 ${className}`}>
    <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    <span>{message}</span>
  </div>
);

/**
 * Toast notification for temporary error messages
 */
interface ErrorToastProps {
  error: AppError;
  onClose: () => void;
  duration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ 
  error, 
  onClose, 
  duration = 5000 
}) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-4 right-4 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 z-50">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">Error</p>
            <p className="mt-1 text-sm text-gray-500">{getUserFriendlyMessage(error)}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;