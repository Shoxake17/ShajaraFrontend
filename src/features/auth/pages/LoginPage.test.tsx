import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: { login: vi.fn(), verifyTwoFactorLogin: vi.fn() },
}));

import { LoginPage } from './LoginPage';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';

const mockApi = vi.mocked(authApi);

describe('LoginPage — "Parolni unutdingizmi?"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
  });

  function renderPage() {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
  }

  it("login maydoni bo'sh bo'lsa ogohlantirish ko'rsatadi, /forgot-password ga o'tmaydi", () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Parolni unutdingizmi?' }));

    expect(
      screen.getByText('Parolni tiklash uchun avval email manzilingizni kiriting'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("login maydoniga telefon raqam kiritilgan bo'lsa (email emas) ogohlantirish ko'rsatadi", () => {
    renderPage();

    fireEvent.input(screen.getByPlaceholderText('Telefon raqam yoki email'), {
      target: { value: '+998901234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Parolni unutdingizmi?' }));

    expect(
      screen.getByText('Parolni tiklash uchun email manzil kiriting (telefon raqam emas)'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("to'g'ri email kiritilgan bo'lsa /forgot-password ga o'sha email bilan o'tadi, email qaytadan so'ralmaydi", () => {
    renderPage();

    fireEvent.input(screen.getByPlaceholderText('Telefon raqam yoki email'), {
      target: { value: 'Test@Example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Parolni unutdingizmi?' }));

    expect(navigateMock).toHaveBeenCalledWith('/forgot-password', {
      state: { email: 'test@example.com' },
    });
  });
});

describe('LoginPage — ikki bosqichli autentifikatsiya (2FA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
  });

  function renderPage() {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
  }

  async function submitLoginForm() {
    fireEvent.input(screen.getByPlaceholderText('Telefon raqam yoki email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.input(screen.getByPlaceholderText('Parol'), { target: { value: 'Parol123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirish' }));
  }

  /** Segmentli OTP inputga kodni bir vaqtda joylashtiradi (haqiqiy paste'ga o'xshab) */
  function fillCode(code: string) {
    fireEvent.paste(screen.getByLabelText('Kod, 1-xona'), { clipboardData: { getData: () => code } });
  }

  it("2FA yoqilgan hisobda parol to'g'ri bo'lsa ham DARHOL sessiya ochilmaydi — kod bosqichi ko'rsatiladi", async () => {
    mockApi.login.mockResolvedValue({ twoFactorRequired: true, ticket: 'ticket-abc' });
    renderPage();

    await submitLoginForm();

    await waitFor(() => expect(screen.getByText('Ikki bosqichli autentifikatsiya')).toBeInTheDocument());
    expect(navigateMock).not.toHaveBeenCalledWith('/doska');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("to'g'ri kod kiritilgach sessiya ochiladi va bosh sahifaga o'tadi", async () => {
    mockApi.login.mockResolvedValue({ twoFactorRequired: true, ticket: 'ticket-abc' });
    mockApi.verifyTwoFactorLogin.mockResolvedValue({
      user: { id: 'u1', fullName: 'Test User', phone: null, email: 'test@example.com', profileVisibility: 'PUBLIC', searchVisibility: 'PUBLIC', dataVisibility: 'PUBLIC', messageVisibility: 'PUBLIC', telegramLinked: false },
      accessToken: 'at-2fa-1',
    });
    renderPage();

    await submitLoginForm();
    await waitFor(() => expect(screen.getByText('Ikki bosqichli autentifikatsiya')).toBeInTheDocument());

    fillCode('654321');
    fireEvent.click(screen.getByRole('button', { name: 'Kodni tekshirish' }));

    await waitFor(() =>
      expect(mockApi.verifyTwoFactorLogin).toHaveBeenCalledWith({ ticket: 'ticket-abc', code: '654321' }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/doska'));
    expect(useAuthStore.getState().accessToken).toBe('at-2fa-1');
  });

  it("noto'g'ri kodda xato ko'rsatiladi, sessiya ochilmaydi", async () => {
    mockApi.login.mockResolvedValue({ twoFactorRequired: true, ticket: 'ticket-abc' });
    mockApi.verifyTwoFactorLogin.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Tasdiqlash kodi noto'g'ri" } },
    });
    renderPage();

    await submitLoginForm();
    await waitFor(() => expect(screen.getByText('Ikki bosqichli autentifikatsiya')).toBeInTheDocument());

    fillCode('000000');
    fireEvent.click(screen.getByRole('button', { name: 'Kodni tekshirish' }));

    await waitFor(() => expect(screen.getByText("Tasdiqlash kodi noto'g'ri")).toBeInTheDocument());
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("'Orqaga' bosilsa login formasiga qaytadi", async () => {
    mockApi.login.mockResolvedValue({ twoFactorRequired: true, ticket: 'ticket-abc' });
    renderPage();

    await submitLoginForm();
    await waitFor(() => expect(screen.getByText('Ikki bosqichli autentifikatsiya')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Orqaga/ }));
    expect(screen.getByPlaceholderText('Telefon raqam yoki email')).toBeInTheDocument();
  });

  it("2FA yoqilmagan hisobda oddiy login DARHOL sessiya ochadi (o'zgarishsiz)", async () => {
    mockApi.login.mockResolvedValue({
      user: { id: 'u1', fullName: 'Test User', phone: null, email: 'test@example.com', profileVisibility: 'PUBLIC', searchVisibility: 'PUBLIC', dataVisibility: 'PUBLIC', messageVisibility: 'PUBLIC', telegramLinked: false },
      accessToken: 'at-normal-1',
    });
    renderPage();

    await submitLoginForm();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/doska'));
    expect(useAuthStore.getState().accessToken).toBe('at-normal-1');
  });

  it("'Zaxira koddan foydalanish' bosilsa segmentli input o'rniga oddiy zaxira kod maydoni ko'rinadi", async () => {
    mockApi.login.mockResolvedValue({ twoFactorRequired: true, ticket: 'ticket-abc' });
    mockApi.verifyTwoFactorLogin.mockResolvedValue({
      user: { id: 'u1', fullName: 'Test User', phone: null, email: 'test@example.com', profileVisibility: 'PUBLIC', searchVisibility: 'PUBLIC', dataVisibility: 'PUBLIC', messageVisibility: 'PUBLIC', telegramLinked: false },
      accessToken: 'at-recovery-1',
    });
    renderPage();

    await submitLoginForm();
    await waitFor(() => expect(screen.getByText('Ikki bosqichli autentifikatsiya')).toBeInTheDocument());
    expect(screen.getByLabelText('Kod, 1-xona')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zaxira koddan foydalanish' }));

    expect(screen.queryByLabelText('Kod, 1-xona')).not.toBeInTheDocument();
    const recoveryInput = screen.getByPlaceholderText('Zaxira kod');
    // Zaxira kod alifbosida 0/1 yo'q (I/O bilan chalkashmasin deb chiqarib tashlangan)
    fireEvent.input(recoveryInput, { target: { value: 'ABCD234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kodni tekshirish' }));

    await waitFor(() =>
      expect(mockApi.verifyTwoFactorLogin).toHaveBeenCalledWith({
        ticket: 'ticket-abc',
        code: 'ABCD234567',
      }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/doska'));
  });
});
