import React, { useState } from 'react';
import type { CoverLetterRequest, ValidationError, FormSubmitHandler } from '../types';
import { Language } from '../types';

interface InputFormProps {
  onSubmit: FormSubmitHandler;
  isLoading?: boolean;
  initialData?: Partial<CoverLetterRequest>;
}

export const InputForm: React.FC<InputFormProps> = ({
  onSubmit,
  isLoading = false,
  initialData = {}
}) => {
  const [formData, setFormData] = useState<CoverLetterRequest>({
    jobDescription: initialData.jobDescription || '',
    hiringManager: initialData.hiringManager || '',
    location: initialData.location || '',
    jobPosition: initialData.jobPosition || '',
    company: initialData.company || '',
    language: initialData.language || Language.ENGLISH,
    openToRelocate: initialData.openToRelocate || false
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const validateForm = (): boolean => {
    const errors: ValidationError[] = [];

    // Job description is required
    if (!formData.jobDescription.trim()) {
      errors.push({
        field: 'jobDescription',
        message: 'Job description is required'
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInputChange = (field: keyof CoverLetterRequest, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field when user starts typing
    if (validationErrors.some(error => error.field === field)) {
      setValidationErrors(prev => prev.filter(error => error.field !== field));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Form submission error:', error);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find(error => error.field === fieldName)?.message;
  };

  const hasError = (fieldName: string): boolean => {
    return validationErrors.some(error => error.field === fieldName);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Job Description - Required Field */}
      <div className="space-y-2">
        <label 
          htmlFor="jobDescription" 
          className="block text-sm font-semibold text-gray-700 flex items-center"
        >
          <svg className="w-4 h-4 mr-1.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Job Description
          <span className="text-red-500 ml-1" aria-label="Required">*</span>
        </label>
        <div className="relative">
          <textarea
            id="jobDescription"
            name="jobDescription"
            value={formData.jobDescription}
            onChange={(e) => handleInputChange('jobDescription', e.target.value)}
            placeholder="Paste the complete job description here. Include responsibilities, requirements, and any specific details mentioned in the posting..."
            rows={8}
            className={`
              w-full px-4 py-3 border rounded-lg shadow-sm resize-vertical transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${hasError('jobDescription') 
                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
            disabled={isLoading}
            required
            aria-describedby={hasError('jobDescription') ? 'jobDescription-error jobDescription-help' : 'jobDescription-help'}
          />
          {/* Character count indicator */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-1 rounded">
            {formData.jobDescription.length} chars
          </div>
        </div>
        <p id="jobDescription-help" className="text-xs text-gray-500">
          The more detailed the job description, the better your cover letter will be tailored.
        </p>
        {hasError('jobDescription') && (
          <div className="flex items-center mt-2">
            <svg className="w-4 h-4 text-red-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p 
              id="jobDescription-error" 
              className="text-sm text-red-600 font-medium"
              role="alert"
            >
              {getFieldError('jobDescription')}
            </p>
          </div>
        )}
      </div>

      {/* Optional Fields Section */}
      <div className="space-y-4">
        <div className="flex items-center">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Optional Details
          </h3>
          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            Helps personalize your letter
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Hiring Manager */}
          <div className="space-y-2">
            <label 
              htmlFor="hiringManager" 
              className="block text-sm font-medium text-gray-700"
            >
              Hiring Manager
            </label>
            <div className="relative">
              <input
                type="text"
                id="hiringManager"
                name="hiringManager"
                value={formData.hiringManager}
                onChange={(e) => handleInputChange('hiringManager', e.target.value)}
                placeholder="John Smith"
                className="
                  w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500
                "
                disabled={isLoading}
              />
              <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label 
              htmlFor="location" 
              className="block text-sm font-medium text-gray-700"
            >
              Location
            </label>
            <div className="relative">
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="New York, NY"
                className="
                  w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500
                "
                disabled={isLoading}
              />
              <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          {/* Job Position */}
          <div className="space-y-2">
            <label 
              htmlFor="jobPosition" 
              className="block text-sm font-medium text-gray-700"
            >
              Job Position
            </label>
            <div className="relative">
              <input
                type="text"
                id="jobPosition"
                name="jobPosition"
                value={formData.jobPosition}
                onChange={(e) => handleInputChange('jobPosition', e.target.value)}
                placeholder="Software Engineer"
                className="
                  w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500
                "
                disabled={isLoading}
              />
              <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Company Field - Full Width */}
        <div className="space-y-2">
          <label 
            htmlFor="company" 
            className="block text-sm font-medium text-gray-700"
          >
            Company Name
          </label>
          <div className="relative">
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Tech Corp Inc."
              className="
                w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500
              "
              disabled={isLoading}
            />
            <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        {/* Language Toggle */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Language
          </label>
          <div className="relative">
            <div className="flex items-center space-x-3 bg-gray-50 p-1 rounded-lg border border-gray-300">
              <button
                type="button"
                onClick={() => handleInputChange('language', Language.ENGLISH)}
                disabled={isLoading}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${formData.language === Language.ENGLISH
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">🇬🇧</span>
                  English
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('language', Language.PORTUGUESE)}
                disabled={isLoading}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${formData.language === Language.PORTUGUESE
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">🇵🇹</span>
                  Português
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Choose the language for your cover letter
            </p>
          </div>
        </div>

        {/* Open to Relocate Checkbox */}
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="openToRelocate"
              name="openToRelocate"
              checked={formData.openToRelocate || false}
              onChange={(e) => handleInputChange('openToRelocate', e.target.checked)}
              disabled={isLoading}
              className="
                h-4 w-4 text-blue-600 border-gray-300 rounded transition-all duration-200
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
            <label 
              htmlFor="openToRelocate" 
              className="ml-3 text-sm font-medium text-gray-700 cursor-pointer select-none"
            >
              Open to relocate
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-7">
            {formData.language === Language.PORTUGUESE 
              ? 'Adiciona "(Disponível para mudança)" ao endereço no PDF'
              : 'Adds "(Open to relocate)" to the address in the PDF'
            }
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading || !formData.jobDescription.trim()}
          className={`
            w-full py-3.5 px-6 rounded-lg font-semibold text-white text-base
            transition-all duration-200 transform
            ${isLoading || !formData.jobDescription.trim()
              ? 'bg-gray-400 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:transform-none'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg 
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
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
              <span>Generating Cover Letter...</span>
              <div className="ml-2 flex space-x-1">
                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Cover Letter
            </span>
          )}
        </button>
        
        {/* Form Progress Indicator */}
        {formData.jobDescription.trim() && (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Ready to generate
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default InputForm;