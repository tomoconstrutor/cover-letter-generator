import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RegenerateModal } from '../RegenerateModal';
import type { RegenerateHandler } from '../../types';

// Mock the RegenerateHandler type
const mockOnRegenerate = vi.fn() as RegenerateHandler;
const mockOnClose = vi.fn();

describe('RegenerateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onRegenerate: mockOnRegenerate,
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any open modals
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<RegenerateModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Regenerate Cover Letter')).toBeInTheDocument();
      expect(screen.getByLabelText('Additional Context (Optional)')).toBeInTheDocument();
    });

    it('should render with proper ARIA attributes', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      
      const title = screen.getByText('Regenerate Cover Letter');
      expect(title).toHaveAttribute('id', 'modal-title');
    });

    it('should render textarea with proper attributes', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      expect(textarea).toHaveAttribute('placeholder');
      expect(textarea).toHaveAttribute('aria-describedby', 'context-help');
      expect(textarea).toHaveAttribute('rows', '4');
    });

    it('should render action buttons', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Regenerate Letter' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update textarea value when user types', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      await user.type(textarea, 'Make it more professional');
      
      expect(textarea).toHaveValue('Make it more professional');
    });

    it('should clear textarea when modal opens', () => {
      const { rerender } = render(<RegenerateModal {...defaultProps} isOpen={false} />);
      
      // Open modal and add text
      rerender(<RegenerateModal {...defaultProps} isOpen={true} />);
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      fireEvent.change(textarea, { target: { value: 'Some text' } });
      
      // Close and reopen modal
      rerender(<RegenerateModal {...defaultProps} isOpen={false} />);
      rerender(<RegenerateModal {...defaultProps} isOpen={true} />);
      
      expect(screen.getByLabelText('Additional Context (Optional)')).toHaveValue('');
    });

    it('should call onRegenerate with trimmed context when form is submitted', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      await user.type(textarea, '  Make it more formal  ');
      
      const submitButton = screen.getByRole('button', { name: 'Regenerate Letter' });
      await user.click(submitButton);
      
      expect(mockOnRegenerate).toHaveBeenCalledWith('Make it more formal');
    });

    it('should call onRegenerate with empty string when no context provided', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Regenerate Letter' });
      await user.click(submitButton);
      
      expect(mockOnRegenerate).toHaveBeenCalledWith('');
    });

    it('should call onClose when form submission is successful', async () => {
      const user = userEvent.setup();
      vi.mocked(mockOnRegenerate).mockResolvedValue(undefined);
      
      render(<RegenerateModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Regenerate Letter' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not call onClose when form submission fails', async () => {
      const user = userEvent.setup();
      vi.mocked(mockOnRegenerate).mockRejectedValue(new Error('API Error'));
      
      render(<RegenerateModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Regenerate Letter' });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnRegenerate).toHaveBeenCalled();
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should disable form elements when isLoading is true', () => {
      render(<RegenerateModal {...defaultProps} isLoading={true} />);
      
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      const submitButton = screen.getByRole('button', { name: /Regenerating/ });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      expect(textarea).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading state in submit button when isLoading is true', () => {
      render(<RegenerateModal {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Regenerating...')).toBeInTheDocument();
      expect(screen.queryByText('Regenerate Letter')).not.toBeInTheDocument();
    });

    it('should disable form elements during submission', async () => {
      const user = userEvent.setup();
      let resolveRegenerate: () => void;
      const regeneratePromise = new Promise<void>((resolve) => {
        resolveRegenerate = resolve;
      });
      vi.mocked(mockOnRegenerate).mockReturnValue(regeneratePromise);
      
      render(<RegenerateModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Regenerate Letter' });
      await user.click(submitButton);
      
      // Check elements are disabled during submission
      expect(screen.getByLabelText('Additional Context (Optional)')).toBeDisabled();
      expect(screen.getByRole('button', { name: /Regenerating/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      
      // Resolve the promise
      resolveRegenerate!();
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Closing', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      // Find the backdrop element by its class
      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      expect(backdrop).toBeInTheDocument();
      
      await user.click(backdrop!);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const modalContent = screen.getByText('Regenerate Cover Letter');
      await user.click(modalContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when Escape is pressed and modal is closed', () => {
      render(<RegenerateModal {...defaultProps} isOpen={false} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      const submitButton = screen.getByRole('button', { name: 'Regenerate Letter' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      // Wait for initial focus
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });
      
      // Tab should move to submit button
      await user.tab();
      expect(document.activeElement).toBe(submitButton);
      
      // Tab should move to cancel button
      await user.tab();
      expect(document.activeElement).toBe(cancelButton);
      
      // Tab from last element should wrap to first
      await user.tab();
      expect(document.activeElement).toBe(textarea);
    });

    it('should handle Shift+Tab for reverse navigation', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      // Wait for initial focus
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });
      
      // Shift+Tab from first element should wrap to last
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(cancelButton);
    });

    it('should focus textarea when modal opens', async () => {
      const { rerender } = render(<RegenerateModal {...defaultProps} isOpen={false} />);
      
      rerender(<RegenerateModal {...defaultProps} isOpen={true} />);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText('Additional Context (Optional)');
        expect(document.activeElement).toBe(textarea);
      }, { timeout: 200 });
    });
  });

  describe('Form Submission', () => {
    it('should prevent form submission when already submitting', async () => {
      const user = userEvent.setup();
      let resolveRegenerate: () => void;
      const regeneratePromise = new Promise<void>((resolve) => {
        resolveRegenerate = resolve;
      });
      vi.mocked(mockOnRegenerate).mockReturnValue(regeneratePromise);
      
      render(<RegenerateModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Regenerate Letter' });
      
      // Click submit button twice quickly
      await user.click(submitButton);
      await user.click(submitButton);
      
      // onRegenerate should only be called once
      expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
      
      resolveRegenerate!();
    });

    it('should prevent form submission when isLoading is true', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} isLoading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /Regenerating/ });
      await user.click(submitButton);
      
      expect(mockOnRegenerate).not.toHaveBeenCalled();
    });

    it('should handle form submission via Enter key', async () => {
      const user = userEvent.setup();
      render(<RegenerateModal {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      await user.type(textarea, 'Test context');
      
      // Submit form by finding the form element directly
      const form = textarea.closest('form')!;
      fireEvent.submit(form);
      
      expect(mockOnRegenerate).toHaveBeenCalledWith('Test context');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Additional Context (Optional)');
      expect(textarea).toHaveAttribute('aria-describedby', 'context-help');
      
      const helpText = screen.getByText(/Leave empty to regenerate/);
      expect(helpText).toHaveAttribute('id', 'context-help');
    });

    it('should have proper heading structure', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Regenerate Cover Letter');
    });

    it('should have proper button roles and labels', () => {
      render(<RegenerateModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: 'Regenerate Letter' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });
});