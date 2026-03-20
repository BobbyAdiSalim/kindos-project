import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppointmentSummary } from '@/app/pages/doctor/appointment-summary';

const navigateMock = vi.fn();
const useParamsMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const getAppointmentByIdMock = vi.fn();
const saveSummaryMock = vi.fn();
const markAppointmentCompleteMock = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => useParamsMock(),
  };
});

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => ({ token: 'session-token' }),
}));

vi.mock('@/app/lib/appointment-api', () => ({
  getAppointmentById: (...args: unknown[]) => getAppointmentByIdMock(...args),
  saveSummary: (...args: unknown[]) => saveSummaryMock(...args),
  markAppointmentComplete: (...args: unknown[]) => markAppointmentCompleteMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('AppointmentSummary page', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useParamsMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    getAppointmentByIdMock.mockReset();
    saveSummaryMock.mockReset();
    markAppointmentCompleteMock.mockReset();

    useParamsMock.mockReturnValue({ id: '11' });
    getAppointmentByIdMock.mockResolvedValue({ id: 11, summary: '' });
    saveSummaryMock.mockResolvedValue(undefined);
    markAppointmentCompleteMock.mockResolvedValue(undefined);
  });

  it('loads appointment and saves summary', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppointmentSummary />
      </MemoryRouter>
    );

    await screen.findByText(/mark appointment as complete/i);

    await user.type(screen.getByPlaceholderText(/brief summary of the visit/i), 'Follow-up completed');
    await user.click(screen.getByRole('button', { name: /save summary/i }));

    await waitFor(() => {
      expect(saveSummaryMock).toHaveBeenCalledWith('session-token', '11', 'Follow-up completed');
      expect(markAppointmentCompleteMock).toHaveBeenCalledWith('session-token', '11');
    });

    expect(toastSuccess).toHaveBeenCalledWith('Summary saved and appointment marked as complete.');
    expect(navigateMock).toHaveBeenCalledWith('/doctor/dashboard');
  });

  it('shows error when save attempted without summary', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppointmentSummary />
      </MemoryRouter>
    );

    await screen.findByText(/mark appointment as complete/i);

    expect(screen.getByRole('button', { name: /save summary/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('loads existing summary from appointment', async () => {
    getAppointmentByIdMock.mockResolvedValue({
      id: 11,
      summary: 'Patient reported improved hearing',
    });

    render(
      <MemoryRouter>
        <AppointmentSummary />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/brief summary of the visit/i)
      ).toHaveValue('Patient reported improved hearing');
    });
  });

  it('cancels and goes back', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppointmentSummary />
      </MemoryRouter>
    );

    await screen.findByText(/mark appointment as complete/i);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('saves summary successfully with content', async () => {
    const user = userEvent.setup();
    saveSummaryMock.mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <AppointmentSummary />
      </MemoryRouter>
    );

    await screen.findByText(/mark appointment as complete/i);

    const summaryInput = screen.getByPlaceholderText(/brief summary of the visit/i);
    await user.type(summaryInput, 'Test summary content');

    const saveButton = screen.getByRole('button', { name: /save summary/i });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(saveSummaryMock).toHaveBeenCalled();
    });
  });
});
