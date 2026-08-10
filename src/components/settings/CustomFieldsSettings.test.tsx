import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomFieldsSettings from './CustomFieldsSettings';
import type { FieldDefinition } from '../../types/preferences';

const field: FieldDefinition = {
  id: 'field-1',
  label: 'Very long custom field label '.repeat(8),
  type: 'text',
  required: false,
};

function renderSettings() {
  return render(
    <CustomFieldsSettings
      customFields={[field]}
      editingCustomField={null}
      customFieldForm={{}}
      setCustomFieldForm={vi.fn()}
      onAddCustomField={vi.fn()}
      onEditCustomField={vi.fn()}
      onUpdateCustomField={vi.fn()}
      onDeleteCustomField={vi.fn()}
      onCancelEdit={vi.fn()}
    />
  );
}

describe('CustomFieldsSettings hardening', () => {
  it('keeps actions keyboard-revealed for long custom field labels', () => {
    renderSettings();

    const edit = screen.getByRole('button', { name: 'Edit' });
    const actions = edit.parentElement;

    expect(actions).toHaveClass('group-focus-within:opacity-100');
    const label = screen.getByText(/Very long custom field label/);
    expect(label.parentElement?.parentElement).toHaveClass('min-w-0');
    expect(label).toHaveClass('break-words');
    fireEvent.focus(edit);
    expect(edit).toBeVisible();
  });
});
