/**
 * Accessibility testing utilities using axe-core
 * These utilities help test components for WCAG compliance
 */

import type { axe } from '@axe-core/playwright';

// Common WCAG rules to test
export const WCAG_RULES = {
  // Level A rules
  'color-contrast': { enabled: true },
  'aria-required-attr': { enabled: true },
  'aria-required-children': { enabled: true },
  'aria-required-parent': { enabled: true },
  'aria-roles': { enabled: true },
  'aria-valid-attr-value': { enabled: true },
  'aria-valid-attr': { enabled: true },
  'button-name': { enabled: true },
  'image-alt': { enabled: true },
  'label': { enabled: true },
  'link-name': { enabled: true },

  // Level AA rules
  'color-contrast-enhanced': { enabled: true },
  'focus-order-semantics': { enabled: true },
  'hidden-content': { enabled: true },
  'skip-link': { enabled: true },
};

// Run axe on a container element
export async function runA11yTest(
  container: HTMLElement,
  options?: axe.RunOptions
): Promise<axe.AxeResults> {
  // Dynamically import axe-core
  const axeModule = await import('@axe-core/playwright');
  const axe = axeModule.axe;

  return axe(container, {
    rules: WCAG_RULES,
    ...options,
  });
}

// Assert no accessibility violations
export function expectNoViolations(results: axe.AxeResults): void {
  const violations = results.violations;

  if (violations.length > 0) {
    const message = violations
      .map((v) => {
        const nodes = v.nodes
          .map((n) => `  - ${n.target.join(', ')}: ${n.failureSummary}`)
          .join('\n');
        return `${v.impact}: ${v.help} (${v.id})\n${nodes}`;
      })
      .join('\n\n');

    throw new Error(`Accessibility violations found:\n\n${message}`);
  }
}

// Format violations for logging
export function formatViolations(results: axe.AxeResults): string {
  if (results.violations.length === 0) {
    return 'No accessibility violations found!';
  }

  return results.violations
    .map(
      (v) =>
        `[${v.impact?.toUpperCase() || 'UNKNOWN'}] ${v.description} (${v.id})\n` +
        `  Help: ${v.helpUrl}\n` +
        `  Nodes: ${v.nodes.length}`
    )
    .join('\n\n');
}

// Filter violations by impact level
export function getViolationsByImpact(
  results: axe.AxeResults,
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
): axe.Result[] {
  return results.violations.filter((v) => v.impact === impact);
}

// Check for specific rule violations
export function hasRuleViolation(results: axe.AxeResults, ruleId: string): boolean {
  return results.violations.some((v) => v.id === ruleId);
}
