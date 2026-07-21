import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    addEmail: vi.fn(),
    confirmAddEmail: vi.fn(),
    resendAddEmailCode: vi.fn(),
  },
}));

import { AddEmailDialog } from './AddEmailDialog';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';

const mockApi = vi.mocked(authApi);

function fillCode(code: string) {
  fireEvent.paste(screen.getByLabelText('Kod, 1-xona'), { clipboardData: { getData: () => code } });
}

async function fillAndSubmitForm(email: string) {
  fireEvent.input(screen.getByPlaceholderText('Email manzil'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }));
}

describe('AddEmailDialog (ikki bosqichli: forma -> kod)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
  });

  it("forma yuborilgach email EMAS, tasdiqlash kodi bosqichi ko'rsatiladi", async () => {
    mockApi.addEmail.mockResolvedValue({ expiresInSeconds: 600 });
    render(<AddEmailDialog open onClose={() => {}} />);

    await fillAndSubmitForm('yangi@mail.com');

    await waitFor(() =>
      expect(mockApi.addEmail).toHaveBeenCalledWith({ email: 'yangi@mail.com' }),
    );
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());
    expect(mockApi.confirmAddEmail).not.toHaveBeenCalled();
  });

  it("to'g'ri kod kiritilgach email saqlanadi va store yangilanadi", async () => {
    mockApi.addEmail.mockResolvedValue({ expiresInSeconds: 600 });
    mockApi.confirmAddEmail.mockResolvedValue({
      id: 'u1',
      fullName: 'Test',
      phone: null,
      email: 'yangi@mail.com',
      profileVisibility: 'PUBLIC',
      searchVisibility: 'PUBLIC',
      dataVisibility: 'PUBLIC',
      messageVisibility: 'PUBLIC',
      telegramLinked: true,
      telegramId: '12345',
      hasPassword: false,
    });
    render(<AddEmailDialog open onClose={() => {}} />);

    await fillAndSubmitForm('yangi@mail.com');
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fillCode('654321');
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }));

    await waitFor(() => expect(mockApi.confirmAddEmail).toHaveBeenCalledWith({ code: '654321' }));
    await waitFor(() => expect(useAuthStore.getState().user?.email).toBe('yangi@mail.com'));
    await waitFor(() => expect(screen.getByText(/muvaffaqiyatli qo'shildi/)).toBeInTheDocument());
  });

  it("'Orqaga' bosilsa formaga qaytadi", async () => {
    mockApi.addEmail.mockResolvedValue({ expiresInSeconds: 600 });
    render(<AddEmailDialog open onClose={() => {}} />);

    await fillAndSubmitForm('yangi@mail.com');
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Orqaga/ }));
    expect(screen.getByPlaceholderText('Email manzil')).toBeInTheDocument();
  });

  it("noto'g'ri email formatida xato ko'rsatiladi, so'rov yuborilmaydi", async () => {
    render(<AddEmailDialog open onClose={() => {}} />);
    fireEvent.input(screen.getByPlaceholderText('Email manzil'), { target: { value: 'notogri' } });
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }));

    await waitFor(() => expect(mockApi.addEmail).not.toHaveBeenCalled());
  });

  describe("hisobda hali PAROL yo'q (Telegram-only) — email+parol BIRGA so'raladi", () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: {
          id: 'u1',
          fullName: 'Test',
          phone: null,
          email: null,
          profileVisibility: 'PUBLIC',
          searchVisibility: 'PUBLIC',
          dataVisibility: 'PUBLIC',
          messageVisibility: 'PUBLIC',
          telegramLinked: true,
          telegramId: '12345',
          hasPassword: false,
        },
        accessToken: 'at',
        initialized: true,
      });
    });

    it("parol maydonlari ko'rsatiladi va to'g'ri to'ldirilsa email+parol BIRGA yuboriladi", async () => {
      mockApi.addEmail.mockResolvedValue({ expiresInSeconds: 600 });
      render(<AddEmailDialog open onClose={() => {}} />);

      fireEvent.input(screen.getByPlaceholderText('Email manzil'), { target: { value: 'yangi@mail.com' } });
      fireEvent.input(screen.getByPlaceholderText('Yangi parol'), { target: { value: 'YangiParol1' } });
      fireEvent.input(screen.getByPlaceholderText('Yangi parolni tasdiqlang'), { target: { value: 'YangiParol1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }));

      await waitFor(() =>
        expect(mockApi.addEmail).toHaveBeenCalledWith({ email: 'yangi@mail.com', password: 'YangiParol1' }),
      );
    });

    it("parollar mos kelmasa xato ko'rsatiladi, so'rov yuborilmaydi", async () => {
      render(<AddEmailDialog open onClose={() => {}} />);

      fireEvent.input(screen.getByPlaceholderText('Email manzil'), { target: { value: 'yangi@mail.com' } });
      fireEvent.input(screen.getByPlaceholderText('Yangi parol'), { target: { value: 'YangiParol1' } });
      fireEvent.input(screen.getByPlaceholderText('Yangi parolni tasdiqlang'), { target: { value: 'Boshqacha2' } });
      fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }));

      await waitFor(() => expect(mockApi.addEmail).not.toHaveBeenCalled());
    });
  });
});
