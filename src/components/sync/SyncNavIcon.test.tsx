import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SyncNavIcon from './SyncNavIcon';

describe('SyncNavIcon', () => {
  it('renders cloud upload icon when logged in', () => {
    const { container } = render(<SyncNavIcon isLoggedIn={true} className='size-5' />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders cloud icon when not logged in', () => {
    const { container } = render(<SyncNavIcon isLoggedIn={false} className='size-5' />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('applies className prop', () => {
    const { container } = render(<SyncNavIcon isLoggedIn={false} className='test-class' />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('test-class')).toBe(true);
  });
});
