import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    forgotPassword: vi.fn(),
    confirmForgotPassword: vi.fn(),
    resendForgotPasswordCode: vi.fn(),
  },
}));

import { ForgotPasswordPage } from './ForgotPasswordPage';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';

const mockApi = vi.mocked(authApi);

async function submitEmailStep() {
  fireEvent.input(screen.getByPlaceholderText('Email manzil'), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }));
}

async function fillResetStep() {
  fireEvent.input(screen.getByPlaceholderText('Yangi parol'), { target: { value: 'YangiParol9' } });
  fireEvent.input(screen.getByPlaceholderText('Yangi parolni tasdiqlang'), {
    target: { value: 'YangiParol9' },
  });
  fireEvent.paste(screen.getByLabelText('Kod, 1-xona'), { clipboardData: { getData: () => '654321' } });
  fireEvent.click(screen.getByRole('button', { name: 'Parolni saqlash' }));
}

describe('ForgotPasswordPage (ikki bosqichli: email -> yangi parol+kod)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
  });

  it("email yuborilgach parol EMAS, yangi parol+kod bosqichi ko'rsatiladi", async () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await submitEmailStep();

    await waitFor(() =>
      expect(mockApi.forgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' }),
    );
    await waitFor(() => expect(screen.getByText('Yangi parol o‘rnating')).toBeInTheDocument());
    expect(mockApi.confirmForgotPassword).not.toHaveBeenCalled();
  });

  it("hisob mavjud bo'lmasa ham UI xuddi shunday bosqichga o'tadi (enumeration himoyasi, server bir xil javob beradi)", async () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await submitEmailStep();

    await waitFor(() => expect(screen.getByText('Yangi parol o‘rnating')).toBeInTheDocument());
  });

  it("to'g'ri kod kiritilgach yangi parol saqlanadi, sessiya ochiladi va bosh sahifaga o'tadi", async () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    mockApi.confirmForgotPassword.mockResolvedValue({
      user: { id: 'u1', fullName: 'Test User', phone: null, email: 'test@example.com', profileVisibility: 'PUBLIC', searchVisibility: 'PUBLIC', dataVisibility: 'PUBLIC', messageVisibility: 'PUBLIC', telegramLinked: false, telegramId: null, hasPassword: true, isAdmin: false },
      accessToken: 'at-reset-1',
    });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await submitEmailStep();
    await waitFor(() => expect(screen.getByText('Yangi parol o‘rnating')).toBeInTheDocument());

    await fillResetStep();

    await waitFor(() =>
      expect(mockApi.confirmForgotPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        code: '654321',
        newPassword: 'YangiParol9',
      }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/doska'));
    expect(useAuthStore.getState().accessToken).toBe('at-reset-1');
  });

  it("noto'g'ri kodda xato ko'rsatiladi, parol saqlanmaydi", async () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    mockApi.confirmForgotPassword.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Tasdiqlash kodi noto'g'ri" } },
    });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await submitEmailStep();
    await waitFor(() => expect(screen.getByText('Yangi parol o‘rnating')).toBeInTheDocument());

    await fillResetStep();

    await waitFor(() => expect(screen.getByText("Tasdiqlash kodi noto'g'ri")).toBeInTheDocument());
    expect(navigateMock).not.toHaveBeenCalledWith('/doska');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("'Orqaga' bosilsa email bosqichiga qaytadi", async () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await submitEmailStep();
    await waitFor(() => expect(screen.getByText('Yangi parol o‘rnating')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Orqaga/ }));
    expect(screen.getByPlaceholderText('Email manzil')).toBeInTheDocument();
  });

  it("'Kodni qayta yuborish' bosilsa resendForgotPasswordCode chaqiriladi va cooldown faol bo'ladi", async () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await submitEmailStep();
    await waitFor(() => expect(screen.getByText('Yangi parol o‘rnating')).toBeInTheDocument());

    // Cooldown darhol faol (60s) — tugma o'chirilgan bo'lishi kerak
    const resendBtn = screen.getByRole('button', { name: /Qayta yuborish/ });
    expect(resendBtn).toBeDisabled();
  });
});

describe('ForgotPasswordPage — LoginPage dan email oldindan uzatilgan holat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
  });

  function renderWithPrefillEmail(email: string) {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/forgot-password', state: { email } }]}>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
  }

  it("email oldindan uzatilgan bo'lsa, email kiritish formasi UMUMAN ko'rsatilmaydi va parol+OTP bosqichi HECH QANDAY loading/spinner'siz DARHOL ko'rinadi", () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    renderWithPrefillEmail('prefill@example.com');

    // Email input hech qachon ekranga chiqmaydi
    expect(screen.queryByPlaceholderText('Email manzil')).not.toBeInTheDocument();
    // Loading/spinner matni yo'q — sinxron ravishda darhol reset bosqichi ko'rinadi
    expect(screen.queryByText(/yubor.*moqda/i)).not.toBeInTheDocument();
    expect(screen.getByText('Yangi parol o‘rnating')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Yangi parol')).toBeInTheDocument();
    expect(screen.getByLabelText('Kod, 1-xona')).toBeInTheDocument();
  });

  it("kod so'rovi orqa fonda yuboriladi (foydalanuvchi parol kiritayotganda)", async () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    renderWithPrefillEmail('prefill@example.com');

    await waitFor(() =>
      expect(mockApi.forgotPassword).toHaveBeenCalledWith({ email: 'prefill@example.com' }),
    );
  });

  it("OTP kod inputi parol maydonlaridan alohida, yakka blokda ko'rsatiladi", () => {
    mockApi.forgotPassword.mockResolvedValue({ expiresInSeconds: 600 });
    renderWithPrefillEmail('prefill@example.com');

    const codeInput = screen.getByLabelText('Kod, 1-xona');
    const codeBlock = screen.getByTestId('otp-block');
    expect(codeBlock).toContainElement(codeInput);
    expect(codeBlock).toHaveTextContent('Tasdiqlash kodi');
    // Parol inputlari OTP blokining ICHIDA emas — alohida blok
    expect(codeBlock.contains(screen.getByPlaceholderText('Yangi parol'))).toBe(false);
  });

  it("kod so'rashda orqa fonda xatolik bo'lsa ham parol+OTP bosqichida qoladi (email formasiga qaytarilmaydi), xato ko'rsatiladi", async () => {
    mockApi.forgotPassword.mockRejectedValue({
      isAxiosError: true,
      response: { status: 429, data: { message: "Juda ko'p urinish. Bir daqiqadan so'ng qayta urinib ko'ring" } },
    });
    renderWithPrefillEmail('prefill@example.com');

    // Xatodan qat'iy nazar — email formasiga hech qachon qaytarilmaydi
    expect(screen.getByPlaceholderText('Yangi parol')).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByText("Juda ko'p urinish. Bir daqiqadan so'ng qayta urinib ko'ring"),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByPlaceholderText('Email manzil')).not.toBeInTheDocument();
  });
});
