import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRef } from 'react';
import useFocusTrap from './useFocusTrap';

function DynamicTrap({ includeSecond, isActive = true }: { includeSecond: boolean; isActive?: boolean }) {
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef, isActive);

  return (
    <div ref={trapRef} data-testid="trap">
      <button type="button">First</button>
      {includeSecond && <button type="button">Second</button>}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('wraps focus around controls added after activation', () => {
    const { rerender } = render(<DynamicTrap includeSecond={false} />);
    const trap = screen.getByTestId('trap');
    const first = screen.getByRole('button', { name: 'First' });

    rerender(<DynamicTrap includeSecond />);
    const second = screen.getByRole('button', { name: 'Second' });
    act(() => second.focus());

    fireEvent.keyDown(trap, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
  });

  it('restores focus to the element active before the trap opened', () => {
    const restoreTarget = document.createElement('button');
    restoreTarget.type = 'button';
    document.body.appendChild(restoreTarget);
    act(() => restoreTarget.focus());

    const { rerender, unmount } = render(<DynamicTrap includeSecond={false} isActive />);
    rerender(<DynamicTrap includeSecond={false} isActive={false} />);
    expect(document.activeElement).toBe(restoreTarget);

    unmount();
    restoreTarget.remove();
  });

  it('falls back to the document body when the previous target is removed', () => {
    const restoreTarget = document.createElement('button');
    restoreTarget.type = 'button';
    document.body.appendChild(restoreTarget);
    act(() => restoreTarget.focus());

    const { rerender } = render(<DynamicTrap includeSecond={false} isActive />);
    restoreTarget.remove();
    rerender(<DynamicTrap includeSecond={false} isActive={false} />);

    expect(document.activeElement).toBe(document.body);
  });


});
