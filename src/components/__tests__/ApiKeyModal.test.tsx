import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeyModal } from '../ApiKeyModal';

describe('ApiKeyModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const user = userEvent.setup();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ApiKeyModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Configure OpenAI API Key')).toBeInTheDocument();
      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    });

    it('should render with proper ARIA attributes', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      
      const title = screen.getByText('Configure OpenAI API Key');
      expect(title).toHaveAttribute('id');
    });

    it('should render input with proper attributes', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      expect(input).toHaveAttribute('type', 'password');
      expect(input).toHaveAttribute('placeholder');
      expect(input).toHaveAttribute('required');
    });

    it('should render action buttons', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update input value when user types', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-test-key-12345');
      
      expect(input).toHaveValue('sk-test-key-12345');
    });

    it('should show/hide API key when toggle button is clicked', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      const toggleButton = screen.getByRole('button', { name: /show api key/i });
      
      expect(input).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /hide api key/i })).toBeInTheDocument();
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should call onSave with API key when form is submitted', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-test-key-12345');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith('sk-test-key-12345');
    });

    it('should call onSave with trimmed API key', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, '  sk-test-key-12345  ');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith('sk-test-key-12345');
    });

    it('should call onClose when form submission is successful', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-test-key-12345');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not call onClose when form submission fails', async () => {
      mockOnSave.mockRejectedValue(new Error('Invalid API key'));
      
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'invalid-key');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should prevent submission when API key is empty', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
      
      await user.click(saveButton);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show validation error for empty API key', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
      
      await waitFor(() => {
        expect(screen.getByText(/api key is required/i)).toBeInTheDocument();
      });
    });

    it('should enable submit button when API key has content', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      const saveButton = screen.getByRole('button', { name: /save/i });
      
      expect(saveButton).toBeDisabled();
      
      await user.type(input, 'sk-test');
      expect(saveButton).not.toBeDisabled();
    });

    it('should validate API key format', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'invalid-format');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid api key format/i)).toBeInTheDocument();
      });
    });

    it('should clear validation error when user starts typing', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      // Trigger validation error
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
      
      await waitFor(() => {
        expect(screen.getByText(/api key is required/i)).toBeInTheDocument();
      });
      
      // Start typing to clear error
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-');
      
      await waitFor(() => {
        expect(screen.queryByText(/api key is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should disable form elements when isLoading is true', () => {
      render(<ApiKeyModal {...defaultProps} isLoading={true} />);
      
      const input = screen.getByLabelText(/api key/i);
      const saveButton = screen.getByRole('button', { name: /saving/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      expect(input).toBeDisabled();
      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading state in submit button when isLoading is true', () => {
      render(<ApiKeyModal {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('should disable form elements during submission', async () => {
      let resolveSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);
      
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-test-key');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Check elements are disabled during submission
      expect(screen.getByLabelText(/api key/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      
      // Resolve the promise
      resolveSave!();
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Closing', () => {
    it('should call onClose when cancel button is clicked', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      expect(backdrop).toBeInTheDocument();
      
      await user.click(backdrop!);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose when modal content is clicked', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const modalContent = screen.getByText('Configure OpenAI API Key');
      await user.click(modalContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should clear form when modal closes and reopens', () => {
      const { rerender } = render(<ApiKeyModal {...defaultProps} isOpen={false} />);
      
      // Open modal and add text
      rerender(<ApiKeyModal {...defaultProps} isOpen={true} />);
      const input = screen.getByLabelText(/api key/i);
      user.type(input, 'some-key');
      
      // Close and reopen modal
      rerender(<ApiKeyModal {...defaultProps} isOpen={false} />);
      rerender(<ApiKeyModal {...defaultProps} isOpen={true} />);
      
      expect(screen.getByLabelText(/api key/i)).toHaveValue('');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when Escape is pressed and modal is closed', () => {
      render(<ApiKeyModal {...defaultProps} isOpen={false} />);
      
      user.keyboard('{Escape}');
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should focus input when modal opens', async () => {
      const { rerender } = render(<ApiKeyModal {...defaultProps} isOpen={false} />);
      
      rerender(<ApiKeyModal {...defaultProps} isOpen={true} />);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/api key/i);
        expect(document.activeElement).toBe(input);
      });
    });

    it('should handle form submission via Enter key', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-test-key');
      await user.keyboard('{Enter}');
      
      expect(mockOnSave).toHaveBeenCalledWith('sk-test-key');
    });

    it('should trap focus within modal', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      const toggleButton = screen.getByRole('button', { name: /show api key/i });
      const saveButton = screen.getByRole('button', { name: /save/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      // Tab through elements
      await user.tab();
      expect(document.activeElement).toBe(toggleButton);
      
      await user.tab();
      expect(document.activeElement).toBe(saveButton);
      
      await user.tab();
      expect(document.activeElement).toBe(cancelButton);
      
      // Tab from last element should wrap to first
      await user.tab();
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API key validation fails', async () => {
      mockOnSave.mockRejectedValue(new Error('Invalid API key provided'));
      
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'invalid-key');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid api key provided/i)).toBeInTheDocument();
      });
    });

    it('should display network error when API test fails', async () => {
      mockOnSave.mockRejectedValue(new Error('Network error - unable to verify API key'));
      
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-test-key');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      let callCount = 0;
      mockOnSave.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve();
      });
      
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-test-key');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/temporary error/i)).toBeInTheDocument();
      });
      
      // Retry
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
      
      expect(callCount).toBe(2);
    });

    it('should handle async onSave errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnSave.mockRejectedValue(new Error('Async error'));
      
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-test-key');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('API key save error:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      expect(input).toHaveAttribute('aria-describedby');
      
      const helpText = screen.getByText(/you can find your api key/i);
      expect(helpText).toHaveAttribute('id');
    });

    it('should have proper heading structure', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const heading = screen.getByRole('heading');
      expect(heading).toHaveTextContent('Configure OpenAI API Key');
    });

    it('should associate error messages with form fields', async () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
      
      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        const input = screen.getByLabelText(/api key/i);
        
        expect(errorMessage).toBeInTheDocument();
        expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
      });
    });

    it('should have accessible button labels', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });
  });

  describe('Security Considerations', () => {
    it('should mask API key input by default', () => {
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should not log API key values', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      await user.type(input, 'sk-secret-key-12345');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Ensure API key is not logged
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('sk-secret-key-12345')
      );
      
      consoleSpy.mockRestore();
    });

    it('should clear input value from memory when modal closes', () => {
      const { rerender } = render(<ApiKeyModal {...defaultProps} />);
      
      const input = screen.getByLabelText(/api key/i);
      user.type(input, 'sk-secret-key');
      
      // Close modal
      rerender(<ApiKeyModal {...defaultProps} isOpen={false} />);
      
      // Reopen modal
      rerender(<ApiKeyModal {...defaultProps} isOpen={true} />);
      
      // Input should be cleared
      expect(screen.getByLabelText(/api key/i)).toHaveValue('');
    });
  });
});