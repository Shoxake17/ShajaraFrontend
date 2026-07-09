import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    changePassword: vi.fn(),
    confirmChangePassword: vi.fn(),
    resendChangePasswordCode: vi.fn(),
  },
}));

import { ChangePasswordDialog } from './ChangePasswordDialog';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';

const mockApi = vi.mocked(authApi);

/** Segmentli OTP inputga kodni bir vaqtda joylashtiradi (haqiqiy paste'ga o'xshab) */
function fillCode(code: string) {
  fireEvent.paste(screen.getByLabelText('Kod, 1-xona'), { clipboardData: { getData: () => code } });
}

async function fillAndSubmitForm() {
  fireEvent.input(screen.getByPlaceholderText('Joriy parol'), { target: { value: 'EskiParol1' } });
  fireEvent.input(screen.getByPlaceholderText('Yangi parol'), { target: { value: 'YangiParol9' } });
  fireEvent.input(screen.getByPlaceholderText('Yangi parolni tasdiqlang'), {
    target: { value: 'YangiParol9' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }));
}

describe('ChangePasswordDialog (ikki bosqichli: forma -> kod)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
  });

  it("forma yuborilgach parol EMAS, tasdiqlash kodi bosqichi ko'rsatiladi", async () => {
    mockApi.changePassword.mockResolvedValue({ expiresInSeconds: 600 });
    render(<ChangePasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();

    await waitFor(() => expect(mockApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'EskiParol1',
      newPassword: 'YangiParol9',
    }));
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());
    // Parol hali tasdiqlanmagan — confirmChangePassword chaqirilmagan
    expect(mockApi.confirmChangePassword).not.toHaveBeenCalled();
  });

  it("to'g'ri kod kiritilgach parol yangilanadi va yangi accessToken saqlanadi", async () => {
    mockApi.changePassword.mockResolvedValue({ expiresInSeconds: 600 });
    mockApi.confirmChangePassword.mockResolvedValue({ accessToken: 'new-at-123' });
    render(<ChangePasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fillCode('654321');
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }));

    await waitFor(() =>
      expect(mockApi.confirmChangePassword).toHaveBeenCalledWith({ code: '654321' }),
    );
    await waitFor(() =>
      expect(screen.getByText(/muvaffaqiyatli o.zgartirildi/)).toBeInTheDocument(),
    );
    expect(useAuthStore.getState().accessToken).toBe('new-at-123');
  });

  it("'Orqaga' bosilsa formaga qaytadi", async () => {
    mockApi.changePassword.mockResolvedValue({ expiresInSeconds: 600 });
    render(<ChangePasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Orqaga/ }));
    expect(screen.getByPlaceholderText('Joriy parol')).toBeInTheDocument();
  });

  it("'Kodni qayta yuborish' bosilsa resendChangePasswordCode chaqiriladi", async () => {
    mockApi.changePassword.mockResolvedValue({ expiresInSeconds: 600 });
    mockApi.resendChangePasswordCode.mockResolvedValue({ expiresInSeconds: 600 });
    render(<ChangePasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    // Cooldown darhol faol (60s) — tugma o'chirilgan bo'lishi kerak
    const resendBtn = screen.getByRole('button', { name: /Qayta yuborish/ });
    expect(resendBtn).toBeDisabled();
  });

  it('yopilganda holat tozalanadi (keyingi ochilishda formadan boshlanadi)', async () => {
    mockApi.changePassword.mockResolvedValue({ expiresInSeconds: 600 });
    const { rerender } = render(<ChangePasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    rerender(<ChangePasswordDialog open={false} onClose={() => {}} />);
    rerender(<ChangePasswordDialog open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByPlaceholderText('Joriy parol')).toBeInTheDocument());
  });
});
