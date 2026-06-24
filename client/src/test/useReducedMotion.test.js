import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../hooks/useReducedMotion';

describe('useReducedMotion Hook', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('should return false if matchMedia is not supported', () => {
    // Simulate environment where matchMedia is undefined
    delete window.matchMedia;

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('should return matches value if matchMedia is supported', () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should support addEventListener/removeEventListener and respond to change events', () => {
    let changeHandler;
    const addEventListenerMock = vi.fn((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });
    const removeEventListenerMock = vi.fn();

    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    expect(addEventListenerMock).toHaveBeenCalled();

    // Trigger change event
    act(() => {
      changeHandler({ matches: true });
    });

    expect(result.current).toBe(true);
  });

  it('should support legacy addListener/removeListener if addEventListener is not available', () => {
    let changeHandler;
    const addListenerMock = vi.fn((handler) => {
      changeHandler = handler;
    });
    const removeListenerMock = vi.fn();

    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: addListenerMock,
      removeListener: removeListenerMock,
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    expect(addListenerMock).toHaveBeenCalled();

    // Trigger change event
    act(() => {
      changeHandler({ matches: true });
    });

    expect(result.current).toBe(true);
  });
});
