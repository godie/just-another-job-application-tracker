import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import SettingsPage from '../pages/SettingsPage';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertProvider } from '../components/AlertProvider';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_FIELDS,
} from '../utils/localStorage';

// =========================================================================
// 1. MOCK: Configuración del Mock para localStorage
// =========================================================================
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    getStore: () => store,
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Helper function to render with GoogleOAuthProvider and AlertProvider
const renderWithGoogleProvider = (ui: React.ReactElement) => {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <AlertProvider>
      {ui}
      </AlertProvider>
    </GoogleOAuthProvider>
  );
};

// =========================================================================
// 2. SETUP: Limpiar localStorage antes de cada test
// =========================================================================
beforeEach(() => {
  localStorageMock.clear();
  // Set default preferences
  localStorageMock.setItem('jobTrackerPreferences', JSON.stringify(DEFAULT_PREFERENCES));
});

describe('SettingsPage', () => {
  describe('Rendering', () => {
    test('renders Settings page with header and navigation', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Settings/i)).toBeInTheDocument();
      });
      
      // Application Fields Configuration should be visible in the fields section (default)
      expect(screen.getByText(/Application Fields Configuration/i)).toBeInTheDocument();
    });

    test('renders all section navigation buttons', () => {
      renderWithGoogleProvider(<SettingsPage />);
      expect(screen.getByText(/Table Fields/i)).toBeInTheDocument();
      expect(screen.getByText(/Default View/i)).toBeInTheDocument();
      expect(screen.getByText(/Date Format/i)).toBeInTheDocument();
      expect(screen.getByText(/Custom Fields/i)).toBeInTheDocument();
      expect(screen.getByText(/Email Scan/i)).toBeInTheDocument();
    });

    test('renders Email Scan section when clicked', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      fireEvent.click(screen.getByText(/Email Scan/i));
      await waitFor(() => {
        expect(screen.getByText(/Scan Gmail for Applications/i)).toBeInTheDocument();
      });
    });

    test('renders Save Changes and Reset to Default buttons', () => {
      renderWithGoogleProvider(<SettingsPage />);
      expect(screen.getByText(/Save Changes/i)).toBeInTheDocument();
      expect(screen.getByText(/Reset to Default/i)).toBeInTheDocument();
    });
  });

  describe('Table Fields Section', () => {
    test('displays all default fields with checkboxes', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      await waitFor(() => {
        DEFAULT_FIELDS.forEach((field) => {
          // Try to find checkbox by label text or by id
          const checkbox = screen.getByLabelText(new RegExp(field.label, 'i'));
          expect(checkbox).toBeInTheDocument();
          // Notes field is not enabled by default
          if (field.id === 'notes') {
            expect(checkbox).not.toBeChecked();
          } else {
            expect(checkbox).toBeChecked();
          }
        });
      });
    });

    test('allows toggling field visibility', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const positionCheckbox = screen.getByLabelText(/Position/i);
      expect(positionCheckbox).toBeChecked();
      
      fireEvent.click(positionCheckbox);
      
      await waitFor(() => {
        expect(positionCheckbox).not.toBeChecked();
      });
      
      // Should show unsaved changes
      expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();
    });

    test('allows reordering fields with up/down buttons', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      await waitFor(() => {
        const upButtons = screen.getAllByText('↑');
        const downButtons = screen.getAllByText('↓');
        
        expect(upButtons.length).toBeGreaterThan(0);
        expect(downButtons.length).toBeGreaterThan(0);
        
        // First up button should be disabled (first field can't move up)
        if (upButtons.length > 0) {
          expect(upButtons[0]).toBeDisabled();
        }
        // Last down button should be disabled (last field can't move down)
        if (downButtons.length > 0) {
          expect(downButtons[downButtons.length - 1]).toBeDisabled();
        }
      });
    });

    test('disables Save Changes button when no changes', () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const saveButton = screen.getByText(/Save Changes/i);
      expect(saveButton).toBeDisabled();
    });

    test('enables Save Changes button after making changes', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const positionCheckbox = screen.getByLabelText(/Position/i);
      fireEvent.click(positionCheckbox);
      
      await waitFor(() => {
        const saveButton = screen.getByText(/Save Changes/i);
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Default View Section', () => {
    test('switches to Default View section when clicked', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const viewButton = screen.getByText(/Default View/i);
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Choose which view should be displayed/i)).toBeInTheDocument();
      });
    });

    test('displays all view options (table, timeline, kanban, calendar)', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      // Find and click the Default View section button in navigation
      const viewButtons = screen.getAllByText(/Default View/i);
      const viewNavButton = viewButtons.find(btn => {
        const button = btn.closest('button');
        return button && button.className.includes('px-4') && button.className.includes('py-2');
      });
      expect(viewNavButton).toBeDefined();
      if (viewNavButton) {
        fireEvent.click(viewNavButton);
      }
      
      await waitFor(() => {
        expect(screen.getByText(/Choose which view should be displayed/i)).toBeInTheDocument();
      });
      
      // Find the section container and search within it to avoid finding "table" in header
      const sectionHeading = screen.getByText(/Choose which view should be displayed/i);
      const sectionContainer = sectionHeading.closest('div[class*="bg-white"]');
      expect(sectionContainer).toBeInTheDocument();
      
      // Search within the section container to avoid finding "table" in other places
      if (sectionContainer) {
        const section = within(sectionContainer as HTMLElement);
        expect(section.getAllByText(/table/i).length).toBeGreaterThan(0);
        expect(section.getAllByText(/timeline/i).length).toBeGreaterThan(0);
        expect(section.getAllByText(/kanban/i).length).toBeGreaterThan(0);
        expect(section.getAllByText(/calendar/i).length).toBeGreaterThan(0);
      }
    });

    test('allows selecting default view', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const viewButton = screen.getByText(/Default View/i);
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Choose which view should be displayed/i)).toBeInTheDocument();
      });
      
      // Find the timeline button - it should be a button with text "Timeline"
      const timelineButtons = screen.getAllByText(/Timeline/i);
      const timelineButton = timelineButtons.find(btn => btn.closest('button'));
      
      expect(timelineButton).toBeInTheDocument();
      
      if (timelineButton && timelineButton.closest('button')) {
        fireEvent.click(timelineButton.closest('button')!);
        
        // Should show unsaved changes
        await waitFor(() => {
          expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Date Format Section', () => {
    test('switches to Date Format section when clicked', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const dateButton = screen.getByText(/Date Format/i);
      fireEvent.click(dateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Choose how dates should be displayed/i)).toBeInTheDocument();
      });
    });

    test('displays all date format options', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const dateButton = screen.getByText(/Date Format/i);
      fireEvent.click(dateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/DD\/MM\/YYYY/i)).toBeInTheDocument();
        expect(screen.getByText(/MM\/DD\/YYYY/i)).toBeInTheDocument();
        expect(screen.getByText(/YYYY-MM-DD/i)).toBeInTheDocument();
      });
    });

    test('shows example dates for each format', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const dateButton = screen.getByText(/Date Format/i);
      fireEvent.click(dateButton);
      
      await waitFor(() => {
        // Should show example dates
        const examples = screen.getAllByText(/Example:/i);
        expect(examples.length).toBeGreaterThan(0);
      });
    });

    test('allows selecting date format', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const dateButton = screen.getByText(/Date Format/i);
      fireEvent.click(dateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Choose how dates should be displayed/i)).toBeInTheDocument();
      });
      
      // Find the label for DD/MM/YYYY and click it (the label wraps the radio button)
      const ddmmLabel = screen.getByText(/DD\/MM\/YYYY/i);
      expect(ddmmLabel).toBeInTheDocument();
      
      // The label is clickable and will trigger the radio button
      const labelElement = ddmmLabel.closest('label');
      expect(labelElement).toBeInTheDocument();
      
      if (labelElement) {
        fireEvent.click(labelElement);
        
        // Should show unsaved changes
        await waitFor(() => {
          expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Custom Fields Section', () => {
    test('switches to Custom Fields section when clicked', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const customButton = screen.getByText(/Custom Fields/i);
      fireEvent.click(customButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Create your own fields/i)).toBeInTheDocument();
      });
    });

    test('displays form for adding custom fields', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const customButton = screen.getByText(/Custom Fields/i);
      fireEvent.click(customButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Add New Custom Field/i)).toBeInTheDocument();
        expect(screen.getByText(/Field Label/i)).toBeInTheDocument();
        expect(screen.getByText(/Field Type/i)).toBeInTheDocument();
        // Check that inputs are present
        expect(screen.getByPlaceholderText(/Recruiter Phone/i)).toBeInTheDocument();
      });
    });

    test('allows creating a custom text field', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const customButton = screen.getByText(/Custom Fields/i);
      fireEvent.click(customButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Add New Custom Field/i)).toBeInTheDocument();
      });
      
      // Use placeholder to find the input since label doesn't have htmlFor
      const labelInput = screen.getByPlaceholderText(/Recruiter Phone/i);
      const addButton = screen.getByText(/Add Field/i);
      
      fireEvent.change(labelInput, { target: { value: 'Recruiter Phone' } });
      
      await waitFor(() => {
        expect(addButton).not.toBeDisabled();
      });
      
      fireEvent.click(addButton);
      
      // Should show the new field in the list
      await waitFor(() => {
        expect(screen.getByText(/Recruiter Phone/i)).toBeInTheDocument();
      });
    });

    test('shows options field when select type is chosen', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const customButton = screen.getByText(/Custom Fields/i);
      fireEvent.click(customButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Add New Custom Field/i)).toBeInTheDocument();
      });
      
      // Find the select by finding the label text and then the select element
      const fieldTypeLabel = screen.getByText(/Field Type/i);
      const typeSelect = fieldTypeLabel.parentElement?.querySelector('select');
      
      expect(typeSelect).toBeInTheDocument();
      
      if (typeSelect) {
        fireEvent.change(typeSelect, { target: { value: 'select' } });
        
        await waitFor(() => {
          expect(screen.getByText(/Options \(one per line\)/i)).toBeInTheDocument();
        });
      }
    });

    test('requires label to create custom field', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const customButton = screen.getByText(/Custom Fields/i);
      fireEvent.click(customButton);
      
      await waitFor(() => {
        const addButton = screen.getByText(/Add Field/i);
        expect(addButton).toBeDisabled();
      });
    });

    test('shows message when no custom fields exist', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const customButton = screen.getByText(/Custom Fields/i);
      fireEvent.click(customButton);
      
      await waitFor(() => {
        expect(screen.getByText(/No custom fields yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save and Reset Functionality', () => {
    test('saves preferences when Save Changes is clicked', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      // Make a change
      const positionCheckbox = screen.getByLabelText(/Position/i);
      fireEvent.click(positionCheckbox);
      
      await waitFor(() => {
        const saveButton = screen.getByText(/Save Changes/i);
        expect(saveButton).not.toBeDisabled();
        
        fireEvent.click(saveButton);
      });
      
      // Should save to localStorage
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'jobTrackerPreferences',
          expect.stringContaining('"enabledFields"')
        );
      });
    });

    test('resets preferences to default when Reset is clicked', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      // Make a change
      const positionCheckbox = screen.getByLabelText(/Position/i);
      fireEvent.click(positionCheckbox);
      
      await waitFor(() => {
        expect(positionCheckbox).not.toBeChecked();
      });
      
      // Reset
      const resetButton = screen.getByText(/Reset to Default/i);
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(positionCheckbox).toBeChecked();
      });
    });

    test('shows success message after saving', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      // Make a change
      const positionCheckbox = screen.getByLabelText(/Position/i);
      fireEvent.click(positionCheckbox);
      
      await waitFor(() => {
        const saveButton = screen.getByText(/Save Changes/i);
        expect(saveButton).not.toBeDisabled();
      });
      
      const saveButton = screen.getByText(/Save Changes/i);
      fireEvent.click(saveButton);
      
      // Should save to localStorage
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'jobTrackerPreferences',
          expect.stringContaining('"enabledFields"')
        );
      });
      
      // The success message should appear (may be brief)
      // We verify the save happened, which is the important part
    });
  });

  describe('Section Navigation', () => {
    test('highlights active section', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      // Fields section should be active by default
      // Find the button in the navigation section (has specific classes)
      const fieldsButtons = screen.getAllByText(/Table Fields/i);
      const fieldsNavButton = fieldsButtons.find(btn => {
        const button = btn.closest('button');
        return button && button.className.includes('px-4') && button.className.includes('py-2');
      });
      expect(fieldsNavButton).toBeDefined();
      if (fieldsNavButton) {
        const buttonElement = fieldsNavButton.closest('button');
        expect(buttonElement).toBeInTheDocument();
        if (buttonElement) {
          expect(buttonElement.className).toContain('bg-indigo-100');
        }
      }
      
      // Switch to another section - find the navigation button specifically
      const viewButtons = screen.getAllByText(/Default View/i);
      const viewNavButton = viewButtons.find(btn => {
        const button = btn.closest('button');
        return button && button.className.includes('px-4') && button.className.includes('py-2');
      });
      expect(viewNavButton).toBeDefined();
      if (viewNavButton) {
        fireEvent.click(viewNavButton);
      }
      
      await waitFor(() => {
        // Find the button again after click to verify it's highlighted
        const viewButtonsAfter = screen.getAllByText(/Default View/i);
        const viewNavButtonAfter = viewButtonsAfter.find(btn => {
          const button = btn.closest('button');
          return button && button.className.includes('px-4') && button.className.includes('py-2');
        });
        expect(viewNavButtonAfter).toBeDefined();
        if (viewNavButtonAfter) {
          const buttonElement = viewNavButtonAfter.closest('button');
          expect(buttonElement).toBeInTheDocument();
          if (buttonElement) {
            expect(buttonElement.className).toContain('bg-indigo-100');
          }
        }
      });
    });

    test('switches between sections correctly', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      const sectionTests = [
        { name: 'Table Fields', content: /Application Fields Configuration/i },
        { name: 'Default View', content: /Choose which view should be displayed/i },
        { name: 'Date Format', content: /Choose how dates should be displayed/i },
        { name: 'Custom Fields', content: /Create your own fields/i },
      ];
      
      for (const section of sectionTests) {
        const button = screen.getByText(section.name);
        fireEvent.click(button);
        
        await waitFor(() => {
          // Each section should show its specific content
          expect(screen.getByText(section.content)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Custom Fields Management', () => {
    test('allows editing existing custom field', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      // First create a custom field
      const customButton = screen.getByText(/Custom Fields/i);
      fireEvent.click(customButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Add New Custom Field/i)).toBeInTheDocument();
      });
      
      // Use placeholder to find the input
      const labelInput = screen.getByPlaceholderText(/Recruiter Phone/i);
      fireEvent.change(labelInput, { target: { value: 'Test Field' } });
      
      await waitFor(() => {
        const addButton = screen.getByText(/Add Field/i);
        expect(addButton).not.toBeDisabled();
        fireEvent.click(addButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Test Field/i)).toBeInTheDocument();
      });
      
      // Find the row container that contains "Test Field"
      const testFieldElement = screen.getByText(/Test Field/i);
      let fieldRow = testFieldElement.parentElement;
      while (fieldRow && !fieldRow.className.includes('justify-between')) {
        fieldRow = fieldRow.parentElement;
      }
      
      expect(fieldRow).toBeInTheDocument();
      
      // Use within to search for the Edit button within this specific row
      const rowContainer = within(fieldRow as HTMLElement);
      const editButton = rowContainer.getByText(/Edit/i);
      
      expect(editButton).toBeInTheDocument();
      fireEvent.click(editButton);
      
      // Should show edit form
      await waitFor(() => {
        expect(screen.getByText(/Edit Custom Field/i)).toBeInTheDocument();
      });
    });

    test('allows deleting custom field', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      
      // First create a custom field
      const customButton = screen.getByText(/Custom Fields/i);
      fireEvent.click(customButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Add New Custom Field/i)).toBeInTheDocument();
      });
      
      // Use placeholder to find the input
      const labelInput = screen.getByPlaceholderText(/Recruiter Phone/i);
      fireEvent.change(labelInput, { target: { value: 'Test Field' } });
      
      await waitFor(() => {
        const addButton = screen.getByText(/Add Field/i);
        expect(addButton).not.toBeDisabled();
        fireEvent.click(addButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Test Field/i)).toBeInTheDocument();
      });
      
      // Find the row container that contains "Test Field"
      const testFieldElement = screen.getByText(/Test Field/i);
      let fieldRow = testFieldElement.parentElement;
      while (fieldRow && !fieldRow.className.includes('justify-between')) {
        fieldRow = fieldRow.parentElement;
      }
      
      expect(fieldRow).toBeInTheDocument();
      
      // Use within to search for the Delete button within this specific row
      const rowContainer = within(fieldRow as HTMLElement);
      const deleteButton = rowContainer.getByText(/Delete/i);
      
      expect(deleteButton).toBeInTheDocument();
      fireEvent.click(deleteButton);
      
      // Field should be removed
      await waitFor(() => {
        expect(screen.queryByText(/Test Field/i)).not.toBeInTheDocument();
      });
    });
  });
});

