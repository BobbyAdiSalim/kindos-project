import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Header } from '@/app/components/layout/header';

const navigateMock = vi.fn();
const toastSuccess = vi.fn();
const logoutMock = vi.fn();

let authState: { user: any; logout: () => Promise<void> };

vi.mock('@/app/lib/auth-context', () => ({
  useAuth: () => authState,
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

vi.mock('@/app/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick, asChild }: any) => (asChild ? <div>{children}</div> : <button onClick={onClick}>{children}</button>),
}));

vi.mock('@/app/components/ui/sheet', () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/app/components/figma/ImageWithFallback', () => ({
  ImageWithFallback: (props: any) => <img {...props} />,
}));

describe('Header', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastSuccess.mockReset();
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
    authState = { user: null, logout: logoutMock };
  });

  it('shows auth actions for unauthenticated users by default', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link', { name: /log in/i }).some((link) => link.getAttribute('href') === '/login')).toBe(true);
    expect(screen.getAllByRole('link', { name: /register/i }).some((link) => link.getAttribute('href') === '/register')).toBe(true);
  });

  it('hides auth actions when showAuth is false', () => {
    render(
      <MemoryRouter>
        <Header showAuth={false} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
  });

  it('renders role-specific links for patient', () => {
    authState = {
      user: { name: 'Pat', email: 'pat@example.com', role: 'patient' },
      logout: logoutMock,
    };

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link', { name: /dashboard/i }).some((link) => link.getAttribute('href') === '/patient/dashboard')).toBe(true);
    expect(screen.getAllByRole('link', { name: /profile/i }).some((link) => link.getAttribute('href') === '/patient/profile')).toBe(true);
    expect(screen.getAllByRole('link', { name: /waitlist/i }).some((link) => link.getAttribute('href') === '/patient/waitlist')).toBe(true);
    expect(screen.getAllByRole('link', { name: /messages/i }).some((link) => link.getAttribute('href') === '/patient/messages')).toBe(true);
  });

  it('renders admin dashboard link and hides patient/doctor-only links', () => {
    authState = {
      user: { name: 'Admin', email: 'admin@example.com', role: 'admin' },
      logout: logoutMock,
    };

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link', { name: /dashboard/i }).some((link) => link.getAttribute('href') === '/admin/dashboard')).toBe(true);
    expect(screen.getAllByRole('link', { name: /profile/i }).some((link) => link.getAttribute('href') === '/')).toBe(true);
    expect(screen.queryByRole('link', { name: /waitlist/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /messages/i })).not.toBeInTheDocument();
  });

  it('logs out and navigates home', async () => {
    const user = userEvent.setup();
    authState = {
      user: { name: 'Doc', email: 'doc@example.com', role: 'doctor' },
      logout: logoutMock,
    };

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    await user.click(screen.getAllByRole('button', { name: /log out/i })[0]);

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
      expect(toastSuccess).toHaveBeenCalledWith('Logged out successfully');
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });
});
