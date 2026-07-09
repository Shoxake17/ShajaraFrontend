import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    sessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
  },
}));

import { SessionsDialog } from './SessionsDialog';
import { authApi } from '@/features/auth/api/auth.api';

const mockApi = vi.mocked(authApi);

const sessionA = {
  id: 'jti-current',
  browser: 'Chrome',
  os: 'Windows',
  device: 'desktop',
  ip: '1.2.3.4',
  createdAt: '2026-07-08T10:00:00.000Z',
  lastSeenAt: '2026-07-08T10:00:00.000Z',
  current: true,
};
const sessionB = {
  id: 'jti-other',
  browser: 'Safari',
  os: 'iOS',
  device: 'mobile',
  ip: '5.6.7.8',
  createdAt: '2026-07-08T11:00:00.000Z',
  lastSeenAt: '2026-07-08T11:00:00.000Z',
  current: false,
};

describe('SessionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ochilganda sessiyalarni yuklaydi va joriy qurilmani belgilaydi', async () => {
    mockApi.sessions.mockResolvedValue([sessionA]);
    render(<SessionsDialog open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('Chrome — Windows')).toBeInTheDocument());
    expect(screen.getByText('Joriy qurilma')).toBeInTheDocument();
  });

  it("real vaqtda yangilanadi: 5s ichida yangi qurilma ro'yxatga qo'shiladi", async () => {
    // shouldAdvanceTime: true — RTL'ning ichki waitFor'i (real vaqtga tayangan)
    // fake timer bilan bir vaqtda ishlashi uchun (vitest/RTL tavsiya qilgan usul)
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mockApi.sessions.mockResolvedValueOnce([sessionA]);
      render(<SessionsDialog open onClose={() => {}} />);
      await waitFor(() => expect(screen.getByText('Chrome — Windows')).toBeInTheDocument());
      expect(screen.queryByText('Safari — iOS')).not.toBeInTheDocument();

      // Boshqa qurilmadan kirildi — keyingi poll'da server ikkalasini qaytaradi
      mockApi.sessions.mockResolvedValue([sessionA, sessionB]);
      await vi.advanceTimersByTimeAsync(5000);

      await waitFor(() => expect(screen.getByText('Safari — iOS')).toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });

  it("joriy qurilma har doim ro'yxatda BIRINCHI bo'ladi, server tartibi qanday bo'lishidan qat'iy nazar", async () => {
    // Server (ataylab) joriyni OXIRIDA qaytaradi — dialog baribir joriyni birinchi chiqarishi shart
    mockApi.sessions.mockResolvedValue([sessionB, sessionA]);
    const { container } = render(<SessionsDialog open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('Safari — iOS')).toBeInTheDocument());
    const text = container.textContent ?? '';
    expect(text.indexOf('Chrome — Windows')).toBeLessThan(text.indexOf('Safari — iOS'));
  });

  it("boshqa qurilmani 'Yakunlash' bossa — o'sha zahoti ro'yxatdan chiqadi", async () => {
    mockApi.sessions.mockResolvedValue([sessionA, sessionB]);
    mockApi.revokeSession.mockResolvedValue(undefined);
    render(<SessionsDialog open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('Safari — iOS')).toBeInTheDocument());

    const otherCard = screen.getByText('Safari — iOS').closest('div.rounded-xl')!;
    const revokeBtn = within(otherCard as HTMLElement).getByRole('button', { name: 'Yakunlash' });
    revokeBtn.click();

    await waitFor(() => expect(mockApi.revokeSession).toHaveBeenCalledWith('jti-other'));
    await waitFor(() => expect(screen.queryByText('Safari — iOS')).not.toBeInTheDocument());
  });
});
