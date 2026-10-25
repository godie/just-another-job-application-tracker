import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadFile } from './download';

describe('downloadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates blob, creates URL, clicks anchor element, and revokes object URL', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test-url');
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();

    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const dummyAnchor = document.createElement('a');
    dummyAnchor.click = clickMock;
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(dummyAnchor);

    downloadFile('test.json', '{"hello":"world"}', 'application/json');

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(dummyAnchor.getAttribute('download')).toBe('test.json');
    expect(dummyAnchor.getAttribute('href')).toBe('blob:test-url');
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url');

    createElementSpy.mockRestore();
  });
});
