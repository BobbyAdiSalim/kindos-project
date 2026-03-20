import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Landing } from '@/app/pages/landing';

const navigateMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
  getDashboardPath: (role: string) => `/${role}/dashboard`,
}));

describe('Landing page', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: null });
  });

  it('redirects authenticated users to their dashboard', () => {
    useAuthMock.mockReturnValue({ user: { role: 'patient' } });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(navigateMock).toHaveBeenCalledWith('/patient/dashboard', { replace: true });
  });

  it('navigates to register from quick action button', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /book appointment/i }));
    expect(navigateMock).toHaveBeenCalledWith('/register');
  });
});
