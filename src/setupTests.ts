// src/setupTests.ts
import React from 'react';
import '@testing-library/jest-dom';
import './tests/google-oauth-mock';
import { vi } from 'vitest';

import enTranslations from './locales/en/translation.json';

// Simple localStorage mock to avoid errors in happy-dom if it's not fully initialized or if vitest is configured with a missing --localstorage-file
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() { return Object.keys(store).length; }
  };
})();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
}
// Also define it on global for tests that use it without window.
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'localStorage', { value: localStorageMock });
}
// For vitest, we might also need globalThis
if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
  try {
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
  } catch {
    // In some environments globalThis.localStorage might be read-only
  }
}

declare global {
  // Flag picked up in components to avoid real network calls while testing.
  var __TEST__: boolean | undefined;
}

const globalWithTestFlag = globalThis as typeof globalThis & { __TEST__?: boolean };
globalWithTestFlag.__TEST__ = true;

/** Flatten nested translation object to dot-notation keys (e.g. common.save -> "Save"). */
function flattenTranslations(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenTranslations(v as Record<string, unknown>, key));
    } else if (typeof v === 'string') {
      out[key] = v;
    }
  }
  return out;
}

const translations = flattenTranslations(enTranslations as Record<string, unknown>);

type TranslationValues = Record<string, string | number | undefined>;

// Mock react-i18next using the same English translations as the app
vi.mock('react-i18next', () => {
  return {
    useTranslation: () => ({
      t: (key: string, options?: TranslationValues) => {
        // i18next plural: try key_one / key_other when count is provided
        let result: string | undefined;
        if (options?.count !== undefined) {
          const count = options.count;
          result =
            count === 1
              ? translations[`${key}_one`] ?? translations[key]
              : translations[`${key}_other`] ?? translations[key];
        } else {
          result = translations[key];
        }
        result = result ?? key;

        // Overrides for tests that expect specific formats
        if (options?.count !== undefined) {
          if (key === 'home.metrics.applications') {
            return options.count === 1 ? 'Application' : 'Applications';
          }
          if (key === 'home.metrics.interviews') {
            return options.count === 1 ? 'Interview' : 'Interviews';
          }
          if (key === 'home.metrics.offers') {
            return options.count === 1 ? 'Offer' : 'Offers';
          }
          if (key === 'home.showing') {
            return options.count === 1
              ? `Showing 1 of ${options.total} applications`
              : `Showing ${options.count} of ${options.total} applications`;
          }
          if (key === 'opportunities.showing') {
            return options.count === 1
              ? `Showing 1 of ${options.total} opportunities`
              : `Showing ${options.count} of ${options.total} opportunities`;
          }
        }

        if (options) {
          Object.keys(options).forEach((optKey) => {
            const value = options[optKey];
            result = result!.replace(
              new RegExp('{{' + optKey + '}}', 'g'),
              value !== undefined ? String(value) : ''
            );
          });
        }
        return result;
      },
      i18n: {
        changeLanguage: () => Promise.resolve(),
        language: 'en',
      },
    }),
    initReactI18next: {
      type: '3rdParty',
      init: () => {},
    },
    Trans: ({
      i18nKey,
      values,
      children,
    }: {
      i18nKey: string;
      values?: TranslationValues;
      children?: React.ReactNode;
    }) => {
      let result = translations[i18nKey] ?? i18nKey ?? '';
      if (values) {
        Object.keys(values).forEach((optKey) => {
          const value = values[optKey];
          result = result.replace(
            new RegExp('{{' + optKey + '}}', 'g'),
            value !== undefined ? String(value) : ''
          );
        });
      }

      if (i18nKey === 'home.showing') {
        return React.createElement('span', null, result);
      }
      if (
        i18nKey === 'support.howItWorksDesc' ||
        i18nKey === 'sheets.loginRequired' ||
        i18nKey === 'common.footer.vibecoded'
      ) {
        return React.createElement('span', {
          dangerouslySetInnerHTML: { __html: result || (children as string) },
        });
      }

      if (result && result !== i18nKey) return result;
      return children;
    },
  };
});
