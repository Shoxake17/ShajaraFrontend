import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    register: vi.fn(),
    confirmRegister: vi.fn(),
    resendRegisterCode: vi.fn(),
  },
}));

import { RegisterPage } from './RegisterPage';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';

const mockApi = vi.mocked(authApi);

/** Mobil va desktop bloklari endi bir vaqtda DOM'da bo'ladi (CSS lg: bilan
 * ko'rsatish/yashirish), shuning uchun testlar faqat mobil blok ichida
 * qidiradi — ikkalanishdan qochish uchun. */
function mobileScope() {
  return within(screen.getByTestId('register-mobile'));
}

/** Segmentli OTP inputga kodni bir vaqtda joylashtiradi (haqiqiy paste'ga o'xshab) */
function fillCode(code: string) {
  fireEvent.paste(mobileScope().getByLabelText('Kod, 1-xona'), { clipboardData: { getData: () => code } });
}

async function fillAndSubmitForm() {
  const scope = mobileScope();
  fireEvent.input(scope.getByPlaceholderText('Ism familiya'), { target: { value: 'Test Foydalanuvchi' } });
  fireEvent.input(scope.getByPlaceholderText('+998 90 123 45 67'), { target: { value: '+998901234567' } });
  fireEvent.input(scope.getByPlaceholderText('Email manzil'), { target: { value: 'test@example.com' } });
  fireEvent.input(scope.getByPlaceholderText('Parol'), { target: { value: 'Parol123' } });
  fireEvent.input(scope.getByPlaceholderText('Parolni tasdiqlang'), { target: { value: 'Parol123' } });
  fireEvent.click(scope.getByRole('checkbox'));
  fireEvent.click(scope.getByRole('button', { name: "Ro‘yxatdan o‘tish" }));
}

describe('RegisterPage (ikki bosqichli: forma -> kod)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
  });

  it("forma yuborilgach hisob EMAS, tasdiqlash kodi bosqichi ko'rsatiladi", async () => {
    mockApi.register.mockResolvedValue({ email: 'test@example.com', expiresInSeconds: 600 });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await fillAndSubmitForm();

    await waitFor(() => expect(mockApi.register).toHaveBeenCalledTimes(1));
    expect(mockApi.register).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Test Foydalanuvchi',
        phone: '+998901234567',
        email: 'test@example.com',
        password: 'Parol123',
      }),
    );
    await waitFor(() => expect(mobileScope().getByText('Emailni tasdiqlang')).toBeInTheDocument());
    expect(mobileScope().getByText('test@example.com')).toBeInTheDocument();
    // Hisob hali yaratilmagan — confirmRegister chaqirilmagan
    expect(mockApi.confirmRegister).not.toHaveBeenCalled();
  });

  it("to'g'ri kod kiritilgach sessiya ochiladi va bosh sahifaga o'tadi", async () => {
    mockApi.register.mockResolvedValue({ email: 'test@example.com', expiresInSeconds: 600 });
    mockApi.confirmRegister.mockResolvedValue({
      user: { id: 'u1', fullName: 'Test Foydalanuvchi', phone: '+998901234567', email: 'test@example.com', profileVisibility: 'PUBLIC', searchVisibility: 'PUBLIC', dataVisibility: 'PUBLIC', messageVisibility: 'PUBLIC', telegramLinked: false, hasPassword: true },
      accessToken: 'at-123',
    });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await fillAndSubmitForm();
    await waitFor(() => expect(mobileScope().getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fillCode('654321');
    fireEvent.click(mobileScope().getByRole('button', { name: 'Tasdiqlash' }));

    await waitFor(() =>
      expect(mockApi.confirmRegister).toHaveBeenCalledWith({ email: 'test@example.com', code: '654321' }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/doska'));
    expect(useAuthStore.getState().accessToken).toBe('at-123');
  });

  it("'Orqaga' bosilsa formaga qaytadi", async () => {
    mockApi.register.mockResolvedValue({ email: 'test@example.com', expiresInSeconds: 600 });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await fillAndSubmitForm();
    await waitFor(() => expect(mobileScope().getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fireEvent.click(mobileScope().getByRole('button', { name: /Orqaga/ }));
    expect(mobileScope().getByText('Ro‘yxatdan o‘tish', { selector: 'h2' })).toBeInTheDocument();
  });
});
