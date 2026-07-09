import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: { loginHistory: vi.fn() },
}));

import { LoginHistoryDialog } from './LoginHistoryDialog';
import { authApi } from '@/features/auth/api/auth.api';

const mockApi = vi.mocked(authApi);

const success = {
  id: 'e1',
  type: 'LOGIN_SUCCESS' as const,
  browser: 'Chrome',
  os: 'Windows',
  device: 'desktop',
  ip: '1.2.3.4',
  createdAt: '2026-07-08T10:00:00.000Z',
};
const failed = {
  id: 'e2',
  type: 'LOGIN_FAILED' as const,
  browser: 'Firefox',
  os: 'Linux',
  device: 'desktop',
  ip: '5.6.7.8',
  createdAt: '2026-07-08T09:00:00.000Z',
};

describe('LoginHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ochilganda kirish tarixini yuklaydi va ko\'rsatadi', async () => {
    mockApi.loginHistory.mockResolvedValue([success, failed]);
    render(<LoginHistoryDialog open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('Muvaffaqiyatli kirish')).toBeInTheDocument());
    expect(screen.getByText("Muvaffaqiyatsiz urinish (noto'g'ri parol)")).toBeInTheDocument();
    expect(screen.getByText(/Chrome — Windows/)).toBeInTheDocument();
    expect(screen.getByText(/Firefox — Linux/)).toBeInTheDocument();
  });

  it("bo'sh tarixda tegishli xabar ko'rsatadi", async () => {
    mockApi.loginHistory.mockResolvedValue([]);
    render(<LoginHistoryDialog open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('Kirish tarixi topilmadi')).toBeInTheDocument());
  });

  it('yopiq bo\'lsa hech narsa render qilmaydi', () => {
    render(<LoginHistoryDialog open={false} onClose={() => {}} />);
    expect(screen.queryByText('Kirish tarixi')).not.toBeInTheDocument();
    expect(mockApi.loginHistory).not.toHaveBeenCalled();
  });
});
