import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputForm } from '../InputForm';

describe('InputForm', () => {
  const mockOnSubmit = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hiring manager/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/job position/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate cover letter/i })).toBeInTheDocument();
    });

    it('should render with initial data when provided', () => {
      const initialData = {
        jobDescription: 'Test job description',
        hiringManager: 'John Doe',
        location: 'New York',
        jobPosition: 'Developer',
        company: 'Test Corp'
      };

      render(<InputForm onSubmit={mockOnSubmit} initialData={initialData} />);

      expect(screen.getByDisplayValue('Test job description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Developer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Corp')).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
      render(<InputForm onSubmit={mockOnSubmit} isLoading={true} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/generating cover letter/i)).toBeInTheDocument();
      
      // All inputs should be disabled
      expect(screen.getByLabelText(/job description/i)).toBeDisabled();
      expect(screen.getByLabelText(/hiring manager/i)).toBeDisabled();
      expect(screen.getByLabelText(/location/i)).toBeDisabled();
      expect(screen.getByLabelText(/job position/i)).toBeDisabled();
      expect(screen.getByLabelText(/company/i)).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should prevent submission when job description is empty', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /generate cover letter/i });
      expect(submitButton).toBeDisabled();

      await user.click(submitButton);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show validation error when submitting empty job description', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText(/job description is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should enable submit button when job description has content', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      const submitButton = screen.getByRole('button', { name: /generate cover letter/i });

      expect(submitButton).toBeDisabled();

      await user.type(jobDescriptionInput, 'Test job description');

      expect(submitButton).not.toBeDisabled();
    });

    it('should clear validation error when user starts typing in job description', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      const form = document.querySelector('form');

      // Trigger validation error
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText(/job description is required/i)).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(jobDescriptionInput, 'Test');

      await waitFor(() => {
        expect(screen.queryByText(/job description is required/i)).not.toBeInTheDocument();
      });
    });

    it('should show error styling on job description field when validation fails', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      const form = document.querySelector('form');

      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(jobDescriptionInput).toHaveClass('border-red-500', 'bg-red-50');
      });
    });
  });

  describe('Input Handling', () => {
    it('should update job description value when typed', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      await user.type(jobDescriptionInput, 'New job description');

      expect(jobDescriptionInput).toHaveValue('New job description');
    });

    it('should update optional fields when typed', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const hiringManagerInput = screen.getByLabelText(/hiring manager/i);
      const locationInput = screen.getByLabelText(/location/i);
      const jobPositionInput = screen.getByLabelText(/job position/i);
      const companyInput = screen.getByLabelText(/company/i);

      await user.type(hiringManagerInput, 'Jane Smith');
      await user.type(locationInput, 'San Francisco');
      await user.type(jobPositionInput, 'Senior Developer');
      await user.type(companyInput, 'Tech Company');

      expect(hiringManagerInput).toHaveValue('Jane Smith');
      expect(locationInput).toHaveValue('San Francisco');
      expect(jobPositionInput).toHaveValue('Senior Developer');
      expect(companyInput).toHaveValue('Tech Company');
    });

    it('should handle form submission with all fields filled', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      const hiringManagerInput = screen.getByLabelText(/hiring manager/i);
      const locationInput = screen.getByLabelText(/location/i);
      const jobPositionInput = screen.getByLabelText(/job position/i);
      const companyInput = screen.getByLabelText(/company/i);

      await user.type(jobDescriptionInput, 'Test job description');
      await user.type(hiringManagerInput, 'John Doe');
      await user.type(locationInput, 'New York');
      await user.type(jobPositionInput, 'Developer');
      await user.type(companyInput, 'Test Corp');

      const submitButton = screen.getByRole('button', { name: /generate cover letter/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          jobDescription: 'Test job description',
          hiringManager: 'John Doe',
          location: 'New York',
          jobPosition: 'Developer',
          company: 'Test Corp'
        });
      });
    });

    it('should handle form submission with only required field filled', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      await user.type(jobDescriptionInput, 'Test job description');

      const submitButton = screen.getByRole('button', { name: /generate cover letter/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          jobDescription: 'Test job description',
          hiringManager: '',
          location: '',
          jobPosition: '',
          company: ''
        });
      });
    });

    it('should trim whitespace from job description for validation', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      const submitButton = screen.getByRole('button', { name: /generate cover letter/i });

      // Type only whitespace
      await user.type(jobDescriptionInput, '   ');

      expect(submitButton).toBeDisabled();

      // Add actual content
      await user.clear(jobDescriptionInput);
      await user.type(jobDescriptionInput, '  Test job description  ');

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Event Handling', () => {
    it('should prevent default form submission', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      await user.type(jobDescriptionInput, 'Test job description');

      const form = document.querySelector('form');
      const preventDefault = vi.fn();
      
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        submitEvent.preventDefault = preventDefault;
        fireEvent(form, submitEvent);
      }

      expect(preventDefault).toHaveBeenCalled();
    });

    it('should handle async onSubmit errors gracefully', async () => {
      const mockOnSubmitWithError = vi.fn().mockRejectedValue(new Error('API Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<InputForm onSubmit={mockOnSubmitWithError} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      await user.type(jobDescriptionInput, 'Test job description');

      const submitButton = screen.getByRole('button', { name: /generate cover letter/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmitWithError).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Form submission error:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const jobDescriptionInput = screen.getByLabelText(/job description/i);
      expect(jobDescriptionInput).toHaveAttribute('required');
      
      // aria-describedby should only be present when there's an error
      expect(jobDescriptionInput).not.toHaveAttribute('aria-describedby');
    });

    it('should associate error messages with form fields', async () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        const jobDescriptionInput = screen.getByLabelText(/job description/i);
        
        expect(errorMessage).toBeInTheDocument();
        expect(jobDescriptionInput).toHaveAttribute('aria-describedby', 'jobDescription-error');
      });
    });

    it('should have proper form structure with labels', () => {
      render(<InputForm onSubmit={mockOnSubmit} />);

      // Check that all inputs have associated labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });

      const button = screen.getByRole('button');
      expect(button).toHaveAccessibleName();
    });
  });
});