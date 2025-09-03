import React, { useState, useEffect, useRef } from 'react';
import type { RegenerateHandler } from '../types';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: RegenerateHandler;
  isLoading?: boolean;
  currentLetterContent?: string; // The content of the currently selected letter
}

export const RegenerateModal: React.FC<RegenerateModalProps> = ({
  isOpen,
  onClose,
  onRegenerate,
  isLoading = false,
  currentLetterContent = ''
}) => {
  const [additionalContext, setAdditionalContext] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [useCurrentLetter, setUseCurrentLetter] = useState<boolean>(false);
  
  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAdditionalContext('');
      setIsSubmitting(false);
      setUseCurrentLetter(false);
      // Focus the textarea when modal opens
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard navigation and escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      // Tab key navigation within modal
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) return;
    
    // Allow submission even with empty context
    setIsSubmitting(true);
    
    try {
      await onRegenerate(additionalContext.trim(), useCurrentLetter);
      onClose();
    } catch (error) {
      console.error('Regeneration error:', error);
      // Error handling is managed by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          ref={modalRef}
          className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 shadow-sm sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3
                  className="text-lg font-semibold leading-6 text-gray-900"
                  id="modal-title"
                >
                  Regenerate Cover Letter
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Provide specific feedback or additional requirements to improve your cover letter. 
                    The AI will use your original job description and all form details, plus your feedback below, to generate a completely new version.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="bg-gray-50 px-4 py-3 sm:px-6">
              <label
                htmlFor="additional-context"
                className="block text-sm font-medium leading-6 text-gray-900 mb-2"
              >
                Additional Context (Optional)
              </label>
              <textarea
                ref={firstFocusableRef}
                id="additional-context"
                name="additional-context"
                rows={4}
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g., 'Emphasize my leadership experience and team management skills' or 'Make it more formal and corporate' or 'Focus more on technical achievements and less on soft skills'"
                className="
                  block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm 
                  ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 
                  focus:ring-2 focus:ring-inset focus:ring-blue-600 
                  sm:text-sm sm:leading-6 resize-vertical
                "
                disabled={isSubmitting || isLoading}
                aria-describedby="context-help"
              />
              <p id="context-help" className="mt-2 text-xs text-gray-500">
                Leave empty to regenerate with the same job details, or add specific feedback to guide the new version. 
                Your original job description and form details will always be included.
              </p>

              {/* Regeneration Mode Checkbox */}
              {currentLetterContent && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start">
                    <div className="flex h-6 items-center">
                      <input
                        id="use-current-letter"
                        name="use-current-letter"
                        type="checkbox"
                        checked={useCurrentLetter}
                        onChange={(e) => setUseCurrentLetter(e.target.checked)}
                        disabled={isSubmitting || isLoading}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 focus:ring-offset-0"
                      />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                      <label htmlFor="use-current-letter" className="font-medium text-gray-900 cursor-pointer">
                        Modify current cover letter instead
                      </label>
                      <p className="text-gray-500 text-xs mt-1">
                        {useCurrentLetter 
                          ? "Will modify the currently selected cover letter based on your feedback above"
                          : "Will generate a completely new cover letter using the original job description + your feedback"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3">
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="
                  inline-flex w-full justify-center items-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 
                  text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 hover:shadow-md
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 
                  focus-visible:outline-blue-600 sm:w-auto
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400
                  transition-all duration-200 transform hover:-translate-y-0.5 active:transform-none
                "
              >
                {isSubmitting || isLoading ? (
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
                    <span>Regenerating...</span>
                    <div className="ml-2 flex space-x-1">
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Regenerate Letter
                  </>
                )}
              </button>
              <button
                ref={lastFocusableRef}
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isLoading}
                className="
                  mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2.5 
                  text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset 
                  ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 sm:mt-0 sm:w-auto
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegenerateModal;