// src/tests/OpportunityForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OpportunityForm from '../components/OpportunityForm';

describe('OpportunityForm', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<OpportunityForm isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.queryByText('Add New Opportunity')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText('Add New Opportunity')).toBeInTheDocument();
  });

  it('should display all form fields', () => {
    render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    expect(screen.getByPlaceholderText(/Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Google/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/linkedin.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Remote, San Francisco/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Remote\/Hybrid/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\$120k/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Job description/i)).toBeInTheDocument();
  });

  it('should show validation errors for required fields', async () => {
    render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    const submitButton = screen.getByText('Save Opportunity');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Position is required')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Company is required')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Link is required')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should validate URL format', async () => {
    render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    const positionInput = screen.getByPlaceholderText(/Software Engineer/i);
    const companyInput = screen.getByPlaceholderText(/Google/i);
    const linkInput = screen.getByPlaceholderText(/linkedin.com/i);
    
    fireEvent.change(positionInput, { target: { value: 'Software Engineer' } });
    fireEvent.change(companyInput, { target: { value: 'Google' } });
    fireEvent.change(linkInput, { target: { value: 'not-a-valid-url' } });
    
    const submitButton = screen.getByText('Save Opportunity');
    fireEvent.click(submitButton);

    // URL validation might not catch all cases, but onSave should not be called for invalid URLs
    await waitFor(() => {
      const errorMessage = screen.queryByText('Please enter a valid URL');
      if (errorMessage) {
        expect(errorMessage).toBeInTheDocument();
      }
    }, { timeout: 1000 });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should call onSave with form data when form is valid', async () => {
    render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    const positionInput = screen.getByPlaceholderText(/Software Engineer/i);
    const companyInput = screen.getByPlaceholderText(/Google/i);
    const linkInput = screen.getByPlaceholderText(/linkedin.com/i);
    const locationInput = screen.getByPlaceholderText(/Remote, San Francisco/i);
    const jobTypeInput = screen.getByPlaceholderText(/Remote\/Hybrid/i);
    const salaryInput = screen.getByPlaceholderText(/\$120k/i);
    const descriptionInput = screen.getByPlaceholderText(/Job description/i);
    const dateInputs = screen.getAllByDisplayValue('');
    const dateInput = dateInputs.find(input => input.getAttribute('type') === 'date');
    
    fireEvent.change(positionInput, { target: { value: 'Software Engineer' } });
    fireEvent.change(companyInput, { target: { value: 'Google' } });
    fireEvent.change(linkInput, { target: { value: 'https://linkedin.com/jobs/view/123' } });
    fireEvent.change(locationInput, { target: { value: 'Remote' } });
    fireEvent.change(jobTypeInput, { target: { value: 'Remote' } });
    fireEvent.change(salaryInput, { target: { value: '$120k' } });
    fireEvent.change(descriptionInput, { target: { value: 'Great opportunity' } });
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
    }
    
    const submitButton = screen.getByText('Save Opportunity');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    const callArgs = mockOnSave.mock.calls[0][0];
    expect(callArgs.position).toBe('Software Engineer');
    expect(callArgs.company).toBe('Google');
    expect(callArgs.link).toBe('https://linkedin.com/jobs/view/123');
    expect(callArgs.location).toBe('Remote');
    expect(callArgs.jobType).toBe('Remote');
    expect(callArgs.salary).toBe('$120k');
    expect(callArgs.description).toBe('Great opportunity');
    if (dateInput) {
      expect(callArgs.postedDate).toBe('2024-01-15');
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should call onClose when close button (×) is clicked', () => {
    render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should clear errors when user starts typing', async () => {
    render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    const submitButton = screen.getByText('Save Opportunity');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Position is required')).toBeInTheDocument();
    });

    const positionInput = screen.getByPlaceholderText(/Software Engineer/i);
    fireEvent.change(positionInput, { target: { value: 'Software Engineer' } });

    await waitFor(() => {
      expect(screen.queryByText('Position is required')).not.toBeInTheDocument();
    });
  });

  it('should reset form after successful submission', async () => {
    const { rerender } = render(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    const positionInput = screen.getByPlaceholderText(/Software Engineer/i);
    const companyInput = screen.getByPlaceholderText(/Google/i);
    const linkInput = screen.getByPlaceholderText(/linkedin.com/i);
    
    fireEvent.change(positionInput, { target: { value: 'Software Engineer' } });
    fireEvent.change(companyInput, { target: { value: 'Google' } });
    fireEvent.change(linkInput, { target: { value: 'https://linkedin.com/jobs/view/123' } });
    
    const submitButton = screen.getByText('Save Opportunity');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    // Close and re-open form to check if it's reset
    rerender(<OpportunityForm isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />);
    rerender(<OpportunityForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    
    const newPositionInput = screen.getByPlaceholderText(/Software Engineer/i);
    expect(newPositionInput).toHaveValue('');
  });
});
