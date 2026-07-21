import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    me: vi.fn(),
  },
}));

import { SharePhoneDialog } from './SharePhoneDialog';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';

const mockApi = vi.mocked(authApi);

const baseUser = {
  id: 'u1',
  fullName: 'Shoxrux',
  phone: null,
  email: null,
  profileVisibility: 'PUBLIC' as const,
  searchVisibility: 'PUBLIC' as const,
  dataVisibility: 'PUBLIC' as const,
  messageVisibility: 'PUBLIC' as const,
  telegramLinked: true,
  hasPassword: true,
};

describe('SharePhoneDialog (Telegram bot orqali telefon ulash)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
    window.open = vi.fn();
  });

  it('"Telegram botni ochish" bosilsa yangi oynada bot havolasi ochiladi', async () => {
    render(<SharePhoneDialog open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Telegram botni ochish' }));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://t.me/'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it("telefon bot orqali ulanganda (poll /auth/me) muvaffaqiyat ko'rsatiladi va store yangilanadi", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mockApi.me.mockResolvedValueOnce({ ...baseUser, phone: null });
      render(<SharePhoneDialog open onClose={() => {}} />);

      expect(screen.getByText('Kutilmoqda…')).toBeInTheDocument();

      mockApi.me.mockResolvedValue({ ...baseUser, phone: '+998901234567' });
      // Birinchi poll (2.5s) HALI "once" (phone: null) qiymatini ishlatadi —
      // ikkinchi poll (5s)da yangi mockResolvedValue qo'llanadi.
      await vi.advanceTimersByTimeAsync(5100);

      await waitFor(() => expect(screen.getByText('Telefon raqam ulandi')).toBeInTheDocument());
      expect(useAuthStore.getState().user?.phone).toBe('+998901234567');
    } finally {
      vi.useRealTimers();
    }
  });

  it('yopilganda holat tozalanadi (keyingi ochilishda qaytadan kutish holatidan boshlanadi)', async () => {
    mockApi.me.mockResolvedValue({ ...baseUser, phone: '+998901234567' });
    const { rerender } = render(<SharePhoneDialog open onClose={() => {}} />);

    rerender(<SharePhoneDialog open={false} onClose={() => {}} />);
    rerender(<SharePhoneDialog open onClose={() => {}} />);

    expect(screen.getByText('Kutilmoqda…')).toBeInTheDocument();
  });
});
