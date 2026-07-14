import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: { me: vi.fn() },
}));

import { useSessionLiveness } from './useSessionLiveness';
import { authApi } from '@/features/auth/api/auth.api';

const mockApi = vi.mocked(authApi);

describe('useSessionLiveness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('har 20 soniyada /auth/me chaqirib sessiya faolligini tekshiradi', async () => {
    mockApi.me.mockResolvedValue({ id: 'u1', fullName: 'Test', phone: null, email: 't@t.uz', profileVisibility: 'PUBLIC' as const });
    renderHook(() => useSessionLiveness());

    expect(mockApi.me).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(mockApi.me).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(mockApi.me).toHaveBeenCalledTimes(2);
  });

  it("sessiya yakunlangan bo'lsa (401/rad) — xato tashqariga chiqmaydi", async () => {
    mockApi.me.mockRejectedValue(new Error('401'));
    renderHook(() => useSessionLiveness());
    await expect(vi.advanceTimersByTimeAsync(20_000)).resolves.not.toThrow();
    expect(mockApi.me).toHaveBeenCalledTimes(1);
  });

  it('unmount bo\'lganda intervalni to\'xtatadi', async () => {
    mockApi.me.mockResolvedValue({ id: 'u1', fullName: 'Test', phone: null, email: 't@t.uz', profileVisibility: 'PUBLIC' as const });
    const { unmount } = renderHook(() => useSessionLiveness());
    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockApi.me).not.toHaveBeenCalled();
  });
});
