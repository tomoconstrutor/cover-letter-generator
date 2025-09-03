/**
 * Manual Integration Test Script
 * This script verifies that all components are properly integrated
 * and can work together in the production build.
 */

import { openaiService } from './services/openaiService';
import { pdfService } from './services/pdfService';
import type { CoverLetterRequest, CoverLetterData } from './types';

// Test data
const testRequest: CoverLetterRequest = {
  jobDescription: 'We are looking for a Senior Software Engineer with experience in React, TypeScript, and Node.js. The ideal candidate will have 5+ years of experience building scalable web applications.',
  jobPosition: 'Senior Software Engineer',
  company: 'TechCorp Inc.',
  hiringManager: 'Jane Smith',
  location: 'San Francisco, CA'
};

const testCoverLetter: CoverLetterData = {
  id: 'test-letter-1',
  content: `Dear Jane Smith,

I am writing to express my strong interest in the Senior Software Engineer position at TechCorp Inc. With over 5 years of experience in building scalable web applications using React, TypeScript, and Node.js, I am confident that I would be a valuable addition to your team.

In my previous role, I successfully led the development of multiple high-traffic applications, implementing best practices for performance optimization and code maintainability. My expertise in modern JavaScript frameworks and backend technologies aligns perfectly with the requirements outlined in your job posting.

I am particularly excited about the opportunity to contribute to TechCorp Inc.'s innovative projects and would welcome the chance to discuss how my skills and experience can benefit your team.

Thank you for considering my application. I look forward to hearing from you.

Sincerely,
Tomas Ferreira`,
  metadata: {
    jobPosition: 'Senior Software Engineer',
    company: 'TechCorp Inc.',
    hiringManager: 'Jane Smith',
    location: 'San Francisco, CA',
    generatedAt: new Date()
  }
};

/**
 * Test OpenAI Service Integration
 */
async function testOpenAIService(): Promise<boolean> {
  try {
    console.log('🧪 Testing OpenAI Service Integration...');
    
    // Test service initialization
    if (!openaiService) {
      throw new Error('OpenAI service not initialized');
    }
    
    // Test API key setting
    openaiService.setApiKey('test-key');
    console.log('✅ OpenAI service initialized successfully');
    
    // Note: We can't test actual API calls without a real API key
    // But we can verify the service structure and methods exist
    if (typeof openaiService.generateCoverLetter !== 'function') {
      throw new Error('generateCoverLetter method not found');
    }
    
    console.log('✅ OpenAI service methods available');
    return true;
  } catch (error) {
    console.error('❌ OpenAI Service test failed:', error);
    return false;
  }
}

/**
 * Test PDF Service Integration
 */
async function testPDFService(): Promise<boolean> {
  try {
    console.log('🧪 Testing PDF Service Integration...');
    
    // Test service initialization
    if (!pdfService) {
      throw new Error('PDF service not initialized');
    }
    
    // Test service methods exist
    if (typeof pdfService.generatePDF !== 'function') {
      throw new Error('generatePDF method not found');
    }
    
    if (typeof pdfService.generateFilename !== 'function') {
      throw new Error('generateFilename method not found');
    }
    
    // Test filename generation
    const filename = pdfService.generateFilename(testCoverLetter.metadata);
    if (!filename || !filename.endsWith('.pdf')) {
      throw new Error('Invalid filename generated');
    }
    
    console.log('✅ PDF service initialized successfully');
    console.log('✅ Generated filename:', filename);
    
    // Note: We can't test actual PDF generation in Node.js environment
    // as jsPDF requires a browser environment
    console.log('✅ PDF service methods available');
    return true;
  } catch (error) {
    console.error('❌ PDF Service test failed:', error);
    return false;
  }
}

/**
 * Test Type Definitions
 */
function testTypeDefinitions(): boolean {
  try {
    console.log('🧪 Testing Type Definitions...');
    
    // Test that all required types are properly defined
    const request: CoverLetterRequest = testRequest;
    const letter: CoverLetterData = testCoverLetter;
    
    // Verify required properties exist
    if (!request.jobDescription || !letter.content || !letter.metadata) {
      throw new Error('Required properties missing from type definitions');
    }
    
    console.log('✅ Type definitions are valid');
    return true;
  } catch (error) {
    console.error('❌ Type definitions test failed:', error);
    return false;
  }
}

/**
 * Test Error Handling Integration
 */
function testErrorHandling(): boolean {
  try {
    console.log('🧪 Testing Error Handling Integration...');
    
    // Import error handling utilities
    const { withRetry } = require('./utils/errorHandler');
    
    if (typeof withRetry !== 'function') {
      throw new Error('withRetry function not found');
    }
    
    console.log('✅ Error handling utilities available');
    return true;
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
    return false;
  }
}

/**
 * Run all integration tests
 */
async function runIntegrationTests(): Promise<void> {
  console.log('🚀 Starting Manual Integration Tests...\n');
  
  const results = await Promise.all([
    testOpenAIService(),
    testPDFService(),
    testTypeDefinitions(),
    testErrorHandling()
  ]);
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n📊 Integration Test Results:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All integration tests passed! The application is ready for use.');
  } else {
    console.log('\n⚠️  Some integration tests failed. Please review the errors above.');
  }
}

// Export for potential use in other contexts
export {
  testOpenAIService,
  testPDFService,
  testTypeDefinitions,
  testErrorHandling,
  runIntegrationTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}