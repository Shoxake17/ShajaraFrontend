import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    setPassword: vi.fn(),
    confirmSetPassword: vi.fn(),
    resendSetPasswordCode: vi.fn(),
    me: vi.fn(),
  },
}));

import { SetPasswordDialog } from './SetPasswordDialog';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/model/auth.store';

const mockApi = vi.mocked(authApi);

const meResponse = (hasPassword: boolean) => ({
  id: 'u1',
  fullName: 'Test',
  phone: null,
  email: 'test@example.com',
  profileVisibility: 'PUBLIC' as const,
  searchVisibility: 'PUBLIC' as const,
  dataVisibility: 'PUBLIC' as const,
  messageVisibility: 'PUBLIC' as const,
  telegramLinked: true,
  telegramId: '12345',
  hasPassword,
});

function fillCode(code: string) {
  fireEvent.paste(screen.getByLabelText('Kod, 1-xona'), { clipboardData: { getData: () => code } });
}

async function fillAndSubmitForm() {
  fireEvent.input(screen.getByPlaceholderText('Yangi parol'), { target: { value: 'YangiParol9' } });
  fireEvent.input(screen.getByPlaceholderText('Yangi parolni tasdiqlang'), {
    target: { value: 'YangiParol9' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }));
}

describe('SetPasswordDialog (parol UMUMAN yo\'q hisobga birinchi marta parol o\'rnatish)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, initialized: false });
  });

  it("emaili bor hisobda: forma yuborilgach parol EMAS, tasdiqlash kodi bosqichi ko'rsatiladi", async () => {
    mockApi.setPassword.mockResolvedValue({ expiresInSeconds: 600 });
    render(<SetPasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();

    await waitFor(() =>
      expect(mockApi.setPassword).toHaveBeenCalledWith({ newPassword: 'YangiParol9' }),
    );
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());
    expect(mockApi.confirmSetPassword).not.toHaveBeenCalled();
  });

  it("to'g'ri kod kiritilgach parol o'rnatiladi va store hasPassword:true bilan yangilanadi", async () => {
    mockApi.setPassword.mockResolvedValue({ expiresInSeconds: 600 });
    mockApi.confirmSetPassword.mockResolvedValue({ success: true });
    mockApi.me.mockResolvedValue(meResponse(true));
    render(<SetPasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fillCode('654321');
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }));

    await waitFor(() => expect(mockApi.confirmSetPassword).toHaveBeenCalledWith({ code: '654321' }));
    await waitFor(() => expect(useAuthStore.getState().user?.hasPassword).toBe(true));
    await waitFor(() => expect(screen.getByText(/muvaffaqiyatli o'rnatildi/)).toBeInTheDocument());
  });

  it("emaili YO'Q hisobda (expiresInSeconds:0): kod bosqichisiz DARHOL muvaffaqiyat ko'rsatiladi", async () => {
    mockApi.setPassword.mockResolvedValue({ expiresInSeconds: 0 });
    mockApi.me.mockResolvedValue(meResponse(true));
    render(<SetPasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();

    await waitFor(() => expect(screen.getByText(/muvaffaqiyatli o'rnatildi/)).toBeInTheDocument());
    expect(mockApi.confirmSetPassword).not.toHaveBeenCalled();
    expect(screen.queryByText('Emailni tasdiqlang')).not.toBeInTheDocument();
  });

  it("'Orqaga' bosilsa formaga qaytadi", async () => {
    mockApi.setPassword.mockResolvedValue({ expiresInSeconds: 600 });
    render(<SetPasswordDialog open onClose={() => {}} />);

    await fillAndSubmitForm();
    await waitFor(() => expect(screen.getByText('Emailni tasdiqlang')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Orqaga/ }));
    expect(screen.getByPlaceholderText('Yangi parol')).toBeInTheDocument();
  });
});
