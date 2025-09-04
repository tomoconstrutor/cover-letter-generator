import { useState, useEffect } from 'react';

/**
 * Custom hook for managing OpenAI API key
 * Always uses the hardcoded API key from environment variable
 */
export const useApiKey = () => {
  // Always use the environment API key
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const isConfigured = true; // Always configured since we have a hardcoded key

  return {
    apiKey,
    isConfigured
  };
};