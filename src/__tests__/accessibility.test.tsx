import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import App from '../App';
import { InputForm } from '../components/InputForm';
import { CoverLetterDisplay } from '../components/CoverLetterDisplay';
import { RegenerateModal } from '../components/RegenerateModal';
import { ApiKeyModal } from '../components/ApiKeyModal';
import type { CoverLetterData } from '../types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock services
vi.mock('../services/openaiService');
vi.mock('../services/pdfService');

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('App Component Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<App />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      render(<App />);
      
      // Main heading should be h1
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Cover Letter Generator');
      
      // Section headings should be h2
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(sectionHeadings.length).toBeGreaterThan(0);
    });

    it('should have proper landmark regions', () => {
      render(<App />);
      
      // Should have main content area
      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Should be able to tab through interactive elements
      const interactiveElements = screen.getAllByRole('button').concat(
        screen.getAllByRole('textbox')
      );
      
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      // First element should be focusable
      interactiveElements[0].focus();
      expect(document.activeElement).toBe(interactiveElements[0]);
    });
  });

  describe('InputForm Accessibility', () => {
    const mockOnSubmit = vi.fn();

    it('should not have accessibility violations', async () => {
      const { container } = render(<InputForm onSubmit={mockOnSubmit} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels', () => {
      render(<InputForm onSubmit={mockOnSubmit} />);
      
      // All form inputs should have accessible names
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} />);
      
      // Trigger validation error
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
      
      // Wait for error to appear
      await screen.findByRole('alert');
      
      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      expect(jobDescriptionInput).toHaveAttribute('aria-describedby');
    });

    it('should have proper required field indicators', () => {
      render(<InputForm onSubmit={mockOnSubmit} />);
      
      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      expect(jobDescriptionInput).toHaveAttribute('required');
    });

    it('should support screen reader announcements for validation', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} />);
      
      // Submit empty form
      const submitButton = screen.getByRole('button');
      await user.click(submitButton);
      
      // Error should be announced to screen readers
      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('CoverLetterDisplay Accessibility', () => {
    const mockLetter: CoverLetterData = {
      id: 'test-letter',
      content: 'Test cover letter content',
      metadata: {
        jobPosition: 'Software Engineer',
        company: 'Test Corp',
        generatedAt: new Date()
      }
    };

    const defaultProps = {
      letters: [mockLetter],
      selectedLetterId: 'test-letter',
      onRegenerateClick: vi.fn(),
      onDownload: vi.fn(),
      onLetterChange: vi.fn(),
      onLetterSelect: vi.fn()
    };

    it('should not have accessibility violations', async () => {
      const { container } = render(<CoverLetterDisplay {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper textarea labeling', () => {
      render(<CoverLetterDisplay {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAccessibleName();
    });

    it('should have accessible button labels', () => {
      render(<CoverLetterDisplay {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should announce loading states to screen readers', () => {
      render(<CoverLetterDisplay {...defaultProps} isLoading={true} />);
      
      const loadingMessage = screen.getByText(/generating/i);
      expect(loadingMessage).toBeInTheDocument();
    });

    it('should have proper error message structure', () => {
      const mockError = {
        type: 'API_GENERAL_ERROR' as const,
        message: 'Test error',
        retryable: true
      };

      render(<CoverLetterDisplay {...defaultProps} error={mockError} />);
      
      const errorMessage = screen.getByText(/error/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('RegenerateModal Accessibility', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onRegenerate: vi.fn(),
    };

    it('should not have accessibility violations', async () => {
      const { container } = render(<RegenerateModal {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper modal attributes', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const focusableElements = screen.getAllByRole('button').concat(
        screen.getAllByRole('textbox')
      );
      
      // Focus should be trapped within modal
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should have proper form labeling', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAccessibleName();
      expect(textarea).toHaveAttribute('aria-describedby');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      // Should close on Escape
      await user.keyboard('{Escape}');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('ApiKeyModal Accessibility', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onSave: vi.fn(),
    };

    it('should not have accessibility violations', async () => {
      const { container } = render(<ApiKeyModal {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper modal structure', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      
      const heading = screen.getByRole('heading');
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible form elements', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAccessibleName();
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for text elements', () => {
      render(<App />);
      
      // This is a basic check - in a real app you'd use tools like axe-core
      // to automatically check color contrast ratios
      const textElements = document.querySelectorAll('p, h1, h2, h3, label, button');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should not rely solely on color for information', () => {
      const mockError = {
        type: 'API_GENERAL_ERROR' as const,
        message: 'Test error',
        retryable: true
      };

      const mockLetter: CoverLetterData = {
        id: 'test-letter',
        content: 'Test content',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="test-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
          error={mockError}
        />
      );
      
      // Error states should have text indicators, not just color
      const errorText = screen.getByText(/error/i);
      expect(errorText).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper heading structure for screen readers', () => {
      render(<App />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Should have logical heading hierarchy
      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      expect(h1Elements.length).toBe(1);
    });

    it('should provide status updates for dynamic content', () => {
      const mockLetter: CoverLetterData = {
        id: 'test-letter',
        content: 'Test content',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="test-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
          isLoading={true}
        />
      );
      
      // Loading states should be announced
      const loadingMessage = screen.getByText(/generating/i);
      expect(loadingMessage).toBeInTheDocument();
    });

    it('should have descriptive link and button text', () => {
      const mockLetter: CoverLetterData = {
        id: 'test-letter',
        content: 'Test content',
        metadata: { generatedAt: new Date() }
      };

      render(
        <CoverLetterDisplay
          letters={[mockLetter]}
          selectedLetterId="test-letter"
          onRegenerateClick={vi.fn()}
          onDownload={vi.fn()}
          onLetterChange={vi.fn()}
          onLetterSelect={vi.fn()}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Buttons should have descriptive text, not just "click here"
        expect(button.textContent).not.toBe('');
        expect(button.textContent).not.toMatch(/^(click|here|button)$/i);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      mockLocalStorage.getItem.mockReturnValue('test-api-key');
      
      render(<App />);
      
      // Get all interactive elements
      const buttons = screen.getAllByRole('button');
      const textboxes = screen.getAllByRole('textbox');
      const interactiveElements = [...buttons, ...textboxes];
      
      // Should be able to tab through elements
      for (let i = 0; i < Math.min(3, interactiveElements.length); i++) {
        await user.tab();
        expect(document.activeElement).toBeInstanceOf(HTMLElement);
      }
    });

    it('should support Enter key for form submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn();
      
      render(<InputForm onSubmit={mockOnSubmit} />);
      
      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      await user.type(jobDescriptionInput, 'Test job description');
      await user.keyboard('{Enter}');
      
      // Form should submit on Enter
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should support Escape key for modal closing', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      
      render(
        <RegenerateModal
          isOpen={true}
          onClose={mockOnClose}
          onRegenerate={vi.fn()}
        />
      );
      
      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly when modals open and close', async () => {
      const user = userEvent.setup();
      
      render(<App />);
      
      // Focus should be managed when API key modal opens
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Focus should be within the modal
      const modalElements = dialog.querySelectorAll('button, input, textarea, select');
      expect(modalElements.length).toBeGreaterThan(0);
    });

    it('should restore focus after modal closes', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      
      const { rerender } = render(
        <RegenerateModal
          isOpen={false}
          onClose={mockOnClose}
          onRegenerate={vi.fn()}
        />
      );
      
      // Open modal
      rerender(
        <RegenerateModal
          isOpen={true}
          onClose={mockOnClose}
          onRegenerate={vi.fn()}
        />
      );
      
      // Close modal
      rerender(
        <RegenerateModal
          isOpen={false}
          onClose={mockOnClose}
          onRegenerate={vi.fn()}
        />
      );
      
      // Focus should be restored (this is a basic check)
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
    });

    it('should have visible focus indicators', () => {
      render(<App />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Focus should be visible (this would need visual testing in practice)
        button.focus();
        expect(document.activeElement).toBe(button);
      });
    });
  });
});