import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/features/tree/api/family.api', () => ({
  familyApi: {
    joinByShareCode: vi.fn(),
  },
}));

import { JoinFamilyDialog } from './JoinFamilyDialog';
import { familyApi } from '@/features/tree/api/family.api';
import { useTreeStore } from '@/features/tree/model/tree.store';

const mockApi = vi.mocked(familyApi);

function fillAndSubmit(code: string) {
  fireEvent.input(screen.getByPlaceholderText('Ulashish kodi'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: "Qo'shilish" }));
}

describe('JoinFamilyDialog (ulashish kodi orqali oila a\'zosi bo\'lib qo\'shilish)', () => {
  const loadBoardMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    loadBoardMock.mockClear().mockResolvedValue(undefined);
    useTreeStore.setState({ loadBoard: loadBoardMock });
  });

  it("to'g'ri kod kiritilsa daraxtga qo'shiladi, doska yangilanadi va /doska'ga o'tadi", async () => {
    mockApi.joinByShareCode.mockResolvedValue({ treeOwnerId: 'owner-1' });
    const onClose = vi.fn();
    render(<JoinFamilyDialog open onClose={onClose} />);

    fillAndSubmit('abcd2345efgh');

    await waitFor(() => expect(mockApi.joinByShareCode).toHaveBeenCalledWith('ABCD2345EFGH'));
    await waitFor(() => expect(loadBoardMock).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/doska'));
  });

  it("noto'g'ri formatdagi kodda xato ko'rsatiladi, so'rov yuborilmaydi", async () => {
    render(<JoinFamilyDialog open onClose={() => {}} />);

    fillAndSubmit('qisqa');

    await waitFor(() => expect(mockApi.joinByShareCode).not.toHaveBeenCalled());
  });

  it("server xato qaytarsa (masalan noto'g'ri kod) xabar ko'rsatiladi, navigate chaqirilmaydi", async () => {
    mockApi.joinByShareCode.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { message: 'Ulashish kodi topilmadi' } },
    });
    render(<JoinFamilyDialog open onClose={() => {}} />);

    fillAndSubmit('abcd2345efgh');

    await waitFor(() => expect(mockApi.joinByShareCode).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Ulashish kodi topilmadi')).toBeInTheDocument());
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('open=false bo\'lsa hech narsa render qilinmaydi', () => {
    const { container } = render(<JoinFamilyDialog open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
