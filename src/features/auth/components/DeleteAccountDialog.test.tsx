import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    deleteAccount: vi.fn(),
    confirmDeleteAccount: vi.fn(),
    resendDeleteAccountCode: vi.fn(),
  },
}));

import { DeleteAccountDialog } from './DeleteAccountDialog';
import { authApi } from '@/features/auth/api/auth.api';

const mockApi = vi.mocked(authApi);

/** Segmentli OTP inputga kodni bir vaqtda joylashtiradi (haqiqiy paste'ga o'xshab) */
function fillCode(code: string) {
  fireEvent.paste(screen.getByLabelText('Kod, 1-xona'), { clipboardData: { getData: () => code } });
}

async function submitForm(password?: string) {
  if (password) {
    fireEvent.input(screen.getByPlaceholderText('Joriy parol'), { target: { value: password } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }));
}

describe('DeleteAccountDialog (ikki bosqichli: forma -> kod, qaytarib bo\'lmaydigan amal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parolli hisobda forma yuborilgach hisob EMAS, tasdiqlash kodi bosqichi ko'rsatiladi", async () => {
    mockApi.deleteAccount.mockResolvedValue({ expiresInSeconds: 600 });
    render(<DeleteAccountDialog open onClose={() => {}} onDeleted={() => {}} />);

    await submitForm('Parol123');

    await waitFor(() =>
      expect(mockApi.deleteAccount).toHaveBeenCalledWith({ password: 'Parol123' }),
    );
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());
    expect(mockApi.confirmDeleteAccount).not.toHaveBeenCalled();
  });

  it("emaili yo'q (sof Telegram) hisobda expiresInSeconds:0 kelsa, kod bosqichisiz DARHOL onDeleted chaqiriladi", async () => {
    mockApi.deleteAccount.mockResolvedValue({ expiresInSeconds: 0 });
    const onDeleted = vi.fn();
    render(<DeleteAccountDialog open onClose={() => {}} onDeleted={onDeleted} />);

    await submitForm();

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(mockApi.confirmDeleteAccount).not.toHaveBeenCalled();
    expect(screen.queryByText('Emailni tasdiqlang')).not.toBeInTheDocument();
  });

  it('parol bo\'sh qoldirilsa ham forma yuboriladi (Google/Telegram hisoblar uchun)', async () => {
    mockApi.deleteAccount.mockResolvedValue({ expiresInSeconds: 600 });
    render(<DeleteAccountDialog open onClose={() => {}} onDeleted={() => {}} />);

    await submitForm();

    await waitFor(() =>
      expect(mockApi.deleteAccount).toHaveBeenCalledWith({ password: undefined }),
    );
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());
  });

  it("to'g'ri kod kiritilgach hisob o'chiriladi va onDeleted chaqiriladi", async () => {
    mockApi.deleteAccount.mockResolvedValue({ expiresInSeconds: 600 });
    mockApi.confirmDeleteAccount.mockResolvedValue({ success: true });
    const onDeleted = vi.fn();
    render(<DeleteAccountDialog open onClose={() => {}} onDeleted={onDeleted} />);

    await submitForm('Parol123');
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fillCode('654321');
    fireEvent.click(screen.getByRole('button', { name: "Hisobni o'chirish" }));

    await waitFor(() =>
      expect(mockApi.confirmDeleteAccount).toHaveBeenCalledWith({ code: '654321' }),
    );
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it("kod noto'g'ri bo'lsa xato ko'rsatiladi va onDeleted CHAQIRILMAYDI", async () => {
    mockApi.deleteAccount.mockResolvedValue({ expiresInSeconds: 600 });
    mockApi.confirmDeleteAccount.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Tasdiqlash kodi noto'g'ri" } },
    });
    const onDeleted = vi.fn();
    render(<DeleteAccountDialog open onClose={() => {}} onDeleted={onDeleted} />);

    await submitForm('Parol123');
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fillCode('000000');
    fireEvent.click(screen.getByRole('button', { name: "Hisobni o'chirish" }));

    await waitFor(() => expect(screen.getByText("Tasdiqlash kodi noto'g'ri")).toBeInTheDocument());
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("'Orqaga' bosilsa formaga qaytadi", async () => {
    mockApi.deleteAccount.mockResolvedValue({ expiresInSeconds: 600 });
    render(<DeleteAccountDialog open onClose={() => {}} onDeleted={() => {}} />);

    await submitForm('Parol123');
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Orqaga/ }));
    expect(screen.getByPlaceholderText('Joriy parol')).toBeInTheDocument();
  });

  it("'Kodni qayta yuborish' bosilsa resendDeleteAccountCode chaqiriladi va cooldown faol bo'ladi", async () => {
    mockApi.deleteAccount.mockResolvedValue({ expiresInSeconds: 600 });
    render(<DeleteAccountDialog open onClose={() => {}} onDeleted={() => {}} />);

    await submitForm('Parol123');
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    const resendBtn = screen.getByRole('button', { name: /Qayta yuborish/ });
    expect(resendBtn).toBeDisabled();
  });

  it('yopilganda holat tozalanadi (keyingi ochilishda formadan boshlanadi)', async () => {
    mockApi.deleteAccount.mockResolvedValue({ expiresInSeconds: 600 });
    const { rerender } = render(<DeleteAccountDialog open onClose={() => {}} onDeleted={() => {}} />);

    await submitForm('Parol123');
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    rerender(<DeleteAccountDialog open={false} onClose={() => {}} onDeleted={() => {}} />);
    rerender(<DeleteAccountDialog open onClose={() => {}} onDeleted={() => {}} />);

    await waitFor(() => expect(screen.getByPlaceholderText('Joriy parol')).toBeInTheDocument());
  });
});
