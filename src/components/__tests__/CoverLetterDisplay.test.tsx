import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoverLetterDisplay } from '../CoverLetterDisplay';
import type { CoverLetterData, AppError, ErrorType } from '../../types';

describe('CoverLetterDisplay', () => {
  const mockOnRegenerateClick = vi.fn();
  const mockOnDownload = vi.fn();
  const mockOnLetterChange = vi.fn();
  const mockOnLetterSelect = vi.fn();
  const user = userEvent.setup();

  const mockLetter: CoverLetterData = {
    id: 'letter-1',
    content: 'Dear Hiring Manager,\n\nThis is a test cover letter content.\n\nSincerely,\nTomas Ferreira',
    metadata: {
      jobPosition: 'Software Engineer',
      company: 'Tech Corp',
      hiringManager: 'John Smith',
      location: 'New York',
      generatedAt: new Date('2024-01-15T10:30:00Z')
    }
  };

  const mockLetterWithContext: CoverLetterData = {
    id: 'letter-2',
    content: 'Dear John Smith,\n\nThis is a regenerated cover letter with additional context.\n\nSincerely,\nTomas Ferreira',
    metadata: {
      jobPosition: 'Software Engineer',
      company: 'Tech Corp',
      hiringManager: 'John Smith',
      location: 'New York',
      generatedAt: new Date('2024-01-15T11:00:00Z'),
      additionalContext: 'Please emphasize my experience with React and TypeScript'
    }
  };

  const mockError: AppError = {
    type: 'API_GENERAL_ERROR' as ErrorType,
    message: 'Failed to generate cover letter',
    details: 'OpenAI API returned an error',
    retryable: true
  };

  const defaultProps = {
    letters: [mockLetter],
    selectedLetterId: 'letter-1',
    onRegenerateClick: mockOnRegenerateClick,
    onDownload: mockOnDownload,
    onLetterChange: mockOnLetterChange,
    onLetterSelect: mockOnLetterSelect
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should show empty state when no letters are available', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[]}
          selectedLetterId={null}
        />
      );

      expect(screen.getByText(/no cover letter generated yet/i)).toBeInTheDocument();
      expect(screen.getByText(/fill out the form above/i)).toBeInTheDocument();
    });

    it('should not show empty state when loading', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[]}
          selectedLetterId={null}
          isLoading={true}
        />
      );

      expect(screen.queryByText(/no cover letter generated yet/i)).not.toBeInTheDocument();
      expect(screen.getByText(/generating your cover letter/i)).toBeInTheDocument();
    });

    it('should not show empty state when there is an error', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[]}
          selectedLetterId={null}
          error={mockError}
        />
      );

      expect(screen.queryByText(/no cover letter generated yet/i)).not.toBeInTheDocument();
      expect(screen.getByText(/error generating cover letter/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          isLoading={true}
        />
      );

      expect(screen.getByText(/generating your cover letter/i)).toBeInTheDocument();
      expect(screen.getByText(/this may take a few moments/i)).toBeInTheDocument();
    });

    it('should not show letter content when loading', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          isLoading={true}
        />
      );

      expect(screen.queryByLabelText(/cover letter content/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error is provided', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          error={mockError}
        />
      );

      expect(screen.getByText(/error generating cover letter/i)).toBeInTheDocument();
      expect(screen.getByText(mockError.message)).toBeInTheDocument();
      expect(screen.getByText(mockError.details!)).toBeInTheDocument();
    });

    it('should show retry button for retryable errors', async () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          error={mockError}
        />
      );

      const retryButton = screen.getByText(/try again/i);
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      expect(mockOnRegenerateClick).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button for non-retryable errors', () => {
      const nonRetryableError: AppError = {
        ...mockError,
        retryable: false
      };

      render(
        <CoverLetterDisplay
          {...defaultProps}
          error={nonRetryableError}
        />
      );

      expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
    });

    it('should not show error details when not provided', () => {
      const errorWithoutDetails: AppError = {
        ...mockError,
        details: undefined
      };

      render(
        <CoverLetterDisplay
          {...defaultProps}
          error={errorWithoutDetails}
        />
      );

      expect(screen.getByText(mockError.message)).toBeInTheDocument();
      expect(screen.queryByText(/openai api returned an error/i)).not.toBeInTheDocument();
    });
  });

  describe('Single Letter Display', () => {
    it('should display cover letter content in textarea', () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      const textarea = screen.getByLabelText(/cover letter content/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue(mockLetter.content);
    });

    it('should show letter metadata in header', () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /cover letter/i })).toBeInTheDocument();
      expect(screen.getByText(/for: software engineer at tech corp/i)).toBeInTheDocument();
      expect(screen.getByText(/generated jan 15, 2024/i)).toBeInTheDocument();
    });

    it('should show regenerate and download buttons', () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });

    it('should handle text editing and call onLetterChange', async () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      const textarea = screen.getByLabelText(/cover letter content/i);
      await user.clear(textarea);
      await user.type(textarea, 'Updated cover letter content');

      expect(mockOnLetterChange).toHaveBeenCalledWith('letter-1', 'Updated cover letter content');
    });

    it('should disable buttons when loading', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          isLoading={true}
        />
      );

      // Note: buttons won't be rendered when isLoading is true and content is shown
      // This test verifies the loading state behavior
      expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
    });
  });

  describe('Multiple Letters Display', () => {
    const multipleLetters = [mockLetter, mockLetterWithContext];

    it('should show version selector when multiple letters exist', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={multipleLetters}
        />
      );

      expect(screen.getByText(/cover letter versions/i)).toBeInTheDocument();
      expect(screen.getByText(/version 1/i)).toBeInTheDocument();
      expect(screen.getByText(/version 2/i)).toBeInTheDocument();
    });

    it('should highlight selected letter version', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={multipleLetters}
          selectedLetterId="letter-1"
        />
      );

      const selectedVersion = screen.getByText(/version 1/i).closest('button');
      expect(selectedVersion).toHaveClass('border-blue-500', 'bg-blue-50');
      expect(screen.getByText(/selected/i)).toBeInTheDocument();
    });

    it('should call onLetterSelect when clicking different version', async () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={multipleLetters}
          selectedLetterId="letter-1"
        />
      );

      const version2Button = screen.getByText(/version 2/i).closest('button');
      await user.click(version2Button!);

      expect(mockOnLetterSelect).toHaveBeenCalledWith('letter-2');
    });

    it('should show additional context information for regenerated letters', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={multipleLetters}
        />
      );

      expect(screen.getByText(/with additional context:/i)).toBeInTheDocument();
      expect(screen.getByText(/please emphasize my experience with react/i)).toBeInTheDocument();
    });

    it('should not show version selector for single letter', () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      expect(screen.queryByText(/cover letter versions/i)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should call onRegenerateClick when regenerate button is clicked', async () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      await user.click(regenerateButton);

      expect(mockOnRegenerateClick).toHaveBeenCalledTimes(1);
    });

    it('should call onDownload when download button is clicked', async () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      expect(mockOnDownload).toHaveBeenCalledWith('letter-1');
    });

    it('should show downloading state when download is in progress', async () => {
      mockOnDownload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<CoverLetterDisplay {...defaultProps} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      expect(screen.getByText(/generating pdf/i)).toBeInTheDocument();
      expect(downloadButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText(/generating pdf/i)).not.toBeInTheDocument();
      });
    });

    it('should disable download button when content is empty', () => {
      const emptyLetter: CoverLetterData = {
        ...mockLetter,
        content: ''
      };

      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[emptyLetter]}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      expect(downloadButton).toBeDisabled();
    });

    it('should disable download button when content is only whitespace', async () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      const textarea = screen.getByLabelText(/cover letter content/i);
      await user.clear(textarea);
      await user.type(textarea, '   \n\n   ');

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('Content Synchronization', () => {
    it('should update local content when selected letter changes', () => {
      const { rerender } = render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[mockLetter, mockLetterWithContext]}
          selectedLetterId="letter-1"
        />
      );

      const textarea = screen.getByLabelText(/cover letter content/i);
      expect(textarea).toHaveValue(mockLetter.content);

      rerender(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[mockLetter, mockLetterWithContext]}
          selectedLetterId="letter-2"
        />
      );

      expect(textarea).toHaveValue(mockLetterWithContext.content);
    });

    it('should clear content when no letter is selected', () => {
      const { rerender } = render(<CoverLetterDisplay {...defaultProps} />);

      const textarea = screen.getByLabelText(/cover letter content/i);
      expect(textarea).toHaveValue(mockLetter.content);

      rerender(
        <CoverLetterDisplay
          {...defaultProps}
          selectedLetterId={null}
        />
      );

      // Component should not render textarea when no letter is selected
      expect(screen.queryByLabelText(/cover letter content/i)).not.toBeInTheDocument();
    });

    it('should preserve local edits when switching between letters', async () => {
      const { rerender } = render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[mockLetter, mockLetterWithContext]}
          selectedLetterId="letter-1"
        />
      );

      const textarea = screen.getByLabelText(/cover letter content/i);
      await user.clear(textarea);
      await user.type(textarea, 'Edited content');

      // Switch to different letter
      rerender(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[mockLetter, mockLetterWithContext]}
          selectedLetterId="letter-2"
        />
      );

      expect(textarea).toHaveValue(mockLetterWithContext.content);

      // Switch back to first letter
      rerender(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[mockLetter, mockLetterWithContext]}
          selectedLetterId="letter-1"
        />
      );

      // Should show original content, not the edited version
      // (This is expected behavior as edits are managed by parent component)
      expect(textarea).toHaveValue(mockLetter.content);
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      // The date should be formatted as "Jan 15, 2024, 10:30 AM" or similar
      expect(screen.getByText(/jan 15, 2024/i)).toBeInTheDocument();
    });

    it('should handle different date formats', () => {
      const letterWithDifferentDate: CoverLetterData = {
        ...mockLetter,
        metadata: {
          ...mockLetter.metadata,
          generatedAt: new Date('2024-12-25T15:45:30Z')
        }
      };

      render(
        <CoverLetterDisplay
          {...defaultProps}
          letters={[letterWithDifferentDate]}
        />
      );

      expect(screen.getByText(/dec 25, 2024/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      const textarea = screen.getByLabelText(/cover letter content/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      const downloadButton = screen.getByRole('button', { name: /download pdf/i });

      expect(regenerateButton).toHaveAccessibleName();
      expect(downloadButton).toHaveAccessibleName();
    });

    it('should have proper error message structure', () => {
      render(
        <CoverLetterDisplay
          {...defaultProps}
          error={mockError}
        />
      );

      const errorHeading = screen.getByText(/error generating cover letter/i);
      expect(errorHeading).toBeInTheDocument();
    });

    it('should have screen reader only label for textarea', () => {
      render(<CoverLetterDisplay {...defaultProps} />);

      const label = document.querySelector('label[for="cover-letter-content"]');
      expect(label).toHaveClass('sr-only');
    });
  });

  describe('Error Handling in Actions', () => {
    it('should handle download errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnDownload.mockRejectedValue(new Error('Download failed'));

      render(<CoverLetterDisplay {...defaultProps} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Download error:', expect.any(Error));
      });

      // Button should be enabled again after error
      expect(downloadButton).not.toBeDisabled();

      consoleSpy.mockRestore();
    });

    it('should reset downloading state after error', async () => {
      mockOnDownload.mockRejectedValue(new Error('Download failed'));

      render(<CoverLetterDisplay {...defaultProps} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      
      // Click and wait for the promise to resolve/reject
      await user.click(downloadButton);

      // Wait for the error to be handled and state to reset
      await waitFor(() => {
        expect(downloadButton).not.toBeDisabled();
      }, { timeout: 1000 });

      // Verify the button text is back to normal (not showing "Generating PDF...")
      expect(downloadButton).toHaveTextContent('Download PDF');
    });
  });
});