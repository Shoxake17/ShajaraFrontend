import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    setupTwoFactor: vi.fn(),
    confirmTwoFactor: vi.fn(),
  },
}));

import { TwoFactorSetupDialog } from './TwoFactorSetupDialog';
import { authApi } from '@/features/auth/api/auth.api';

const mockApi = vi.mocked(authApi);

/** Segmentli OTP inputga kodni bir vaqtda joylashtiradi (haqiqiy paste'ga o'xshab) */
function fillCode(code: string) {
  fireEvent.paste(screen.getByLabelText('Kod, 1-xona'), { clipboardData: { getData: () => code } });
}

describe('TwoFactorSetupDialog (uch bosqichli: yuklash -> skanerlash -> zaxira kodlar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ochilishi bilan yangi kalit so\'raladi, QR kod va qo\'lda kiritish uchun matn ko\'rsatiladi', async () => {
    mockApi.setupTwoFactor.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Shajara:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Shajara',
      qrCodeDataUrl: 'data:image/png;base64,ABC123',
    });
    render(<TwoFactorSetupDialog open onClose={() => {}} onEnabled={() => {}} />);

    await waitFor(() => expect(mockApi.setupTwoFactor).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument());
    expect(screen.getByAltText('2FA QR kod')).toHaveAttribute('src', 'data:image/png;base64,ABC123');
  });

  it("to'g'ri kod kiritilgach 2FA yoqiladi va zaxira kodlar ko'rsatiladi", async () => {
    mockApi.setupTwoFactor.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/x',
      qrCodeDataUrl: 'data:image/png;base64,ABC123',
    });
    mockApi.confirmTwoFactor.mockResolvedValue({
      recoveryCodes: ['AAAA111111', 'BBBB222222'],
    });
    const onEnabled = vi.fn();
    render(<TwoFactorSetupDialog open onClose={() => {}} onEnabled={onEnabled} />);

    await waitFor(() => expect(screen.getByLabelText('Kod, 1-xona')).toBeInTheDocument());
    fillCode('654321');
    fireEvent.click(screen.getByRole('button', { name: 'Yoqish' }));

    await waitFor(() => expect(mockApi.confirmTwoFactor).toHaveBeenCalledWith({ code: '654321' }));
    await waitFor(() => expect(screen.getByText('Zaxira kodlar')).toBeInTheDocument());
    expect(screen.getByText('AAAA111111')).toBeInTheDocument();
    expect(screen.getByText('BBBB222222')).toBeInTheDocument();
    // onEnabled faqat "Saqladim, yopish" bosilgach chaqiriladi — hali emas
    expect(onEnabled).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Saqladim, yopish' }));
    expect(onEnabled).toHaveBeenCalledTimes(1);
  });

  it("noto'g'ri kodda xato ko'rsatiladi, 2FA yoqilmaydi", async () => {
    mockApi.setupTwoFactor.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/x',
      qrCodeDataUrl: 'data:image/png;base64,ABC123',
    });
    mockApi.confirmTwoFactor.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Tasdiqlash kodi noto'g'ri" } },
    });
    render(<TwoFactorSetupDialog open onClose={() => {}} onEnabled={() => {}} />);

    await waitFor(() => expect(screen.getByLabelText('Kod, 1-xona')).toBeInTheDocument());
    fillCode('000000');
    fireEvent.click(screen.getByRole('button', { name: 'Yoqish' }));

    await waitFor(() => expect(screen.getByText("Tasdiqlash kodi noto'g'ri")).toBeInTheDocument());
    expect(screen.queryByText('Zaxira kodlar')).not.toBeInTheDocument();
  });

  it('kalit so\'rashda xatolik bo\'lsa, xato ko\'rsatiladi va "Yopish" tugmasi chiqadi', async () => {
    mockApi.setupTwoFactor.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Ikki bosqichli autentifikatsiya allaqachon yoqilgan' } },
    });
    render(<TwoFactorSetupDialog open onClose={() => {}} onEnabled={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText('Ikki bosqichli autentifikatsiya allaqachon yoqilgan')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Yopish' })).toBeInTheDocument();
  });
});
