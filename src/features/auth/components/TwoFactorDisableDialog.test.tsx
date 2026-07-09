import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    disableTwoFactor: vi.fn(),
  },
}));

import { TwoFactorDisableDialog } from './TwoFactorDisableDialog';
import { authApi } from '@/features/auth/api/auth.api';

const mockApi = vi.mocked(authApi);

describe('TwoFactorDisableDialog (joriy parol majburiy tasdiqlanadi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("to'g'ri parolda o'chiradi va onDisabled+onClose chaqiriladi", async () => {
    mockApi.disableTwoFactor.mockResolvedValue(undefined);
    const onDisabled = vi.fn();
    const onClose = vi.fn();
    render(<TwoFactorDisableDialog open onClose={onClose} onDisabled={onDisabled} />);

    fireEvent.input(screen.getByPlaceholderText('Joriy parol'), { target: { value: 'Parol123' } });
    fireEvent.click(screen.getByRole('button', { name: 'O‘chirish' }));

    await waitFor(() => expect(mockApi.disableTwoFactor).toHaveBeenCalledWith({ password: 'Parol123' }));
    await waitFor(() => expect(onDisabled).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("noto'g'ri parolda xato ko'rsatiladi, o'chirilmaydi", async () => {
    mockApi.disableTwoFactor.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Parol noto'g'ri" } },
    });
    const onDisabled = vi.fn();
    render(<TwoFactorDisableDialog open onClose={() => {}} onDisabled={onDisabled} />);

    fireEvent.input(screen.getByPlaceholderText('Joriy parol'), { target: { value: 'NotoGri1' } });
    fireEvent.click(screen.getByRole('button', { name: 'O‘chirish' }));

    await waitFor(() => expect(screen.getByText("Parol noto'g'ri")).toBeInTheDocument());
    expect(onDisabled).not.toHaveBeenCalled();
  });

  it('bo\'sh bo\'lsa "Bekor qilish" bosilganda API chaqirilmasdan yopiladi', () => {
    const onClose = vi.fn();
    render(<TwoFactorDisableDialog open onClose={onClose} onDisabled={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockApi.disableTwoFactor).not.toHaveBeenCalled();
  });
});
