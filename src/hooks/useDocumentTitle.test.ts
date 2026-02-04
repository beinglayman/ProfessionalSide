import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it('sets document title with default suffix', () => {
    renderHook(() => useDocumentTitle('Activity'));
    expect(document.title).toBe('Activity | inChronicle');
  });

  it('sets document title with custom suffix', () => {
    renderHook(() => useDocumentTitle('Profile', 'MyApp'));
    expect(document.title).toBe('Profile | MyApp');
  });

  it('restores previous title on unmount', () => {
    document.title = 'Original Title';
    const { unmount } = renderHook(() => useDocumentTitle('Activity'));

    expect(document.title).toBe('Activity | inChronicle');
    unmount();
    expect(document.title).toBe('Original Title');
  });

  it('updates title when title prop changes', () => {
    const { rerender } = renderHook(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: 'Activity' } }
    );

    expect(document.title).toBe('Activity | inChronicle');

    rerender({ title: 'Profile' });
    expect(document.title).toBe('Profile | inChronicle');
  });
});
