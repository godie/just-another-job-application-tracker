// src/types/table.ts
export interface TableColumn {
  /**
   * Internal field identifier used to map against JobApplication keys.
   * Should match the `id` used in DEFAULT_FIELDS or custom field IDs.
   */
  id: string;
  /**
   * Localized label shown in the UI. This comes from i18n translations
   * or user-defined labels for custom fields.
   */
  label: string;
}

