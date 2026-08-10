import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table } from './Table';

describe('Table accessibility', () => {
  it('provides a named horizontal overflow region without a misleading tab stop', () => {
    render(
      <Table>
        <thead>
          <tr><th>Position</th></tr>
        </thead>
        <tbody>
          <tr><td>Engineer</td></tr>
        </tbody>
      </Table>,
    );

    const region = screen.getByRole('region', { name: /data table/i });
    expect(region).toHaveAttribute('aria-label', 'Data Table');
    expect(region).not.toHaveAttribute('tabindex');
  });
});
