import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { NeedsQuestionnaire } from '@/app/pages/patient/questionnaire';

const navigateMock = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('NeedsQuestionnaire page', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('advances through steps and builds provider query params', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NeedsQuestionnaire />
      </MemoryRouter>
    );

    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/primary care/i));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.click(screen.getByLabelText(/within 1 week/i));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.click(screen.getByLabelText(/no preference/i));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.click(screen.getByText(/asl \(american sign language\) support/i));
    await user.click(screen.getByRole('button', { name: /find providers/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining('/patient/providers?')
    );

    const finalPath = navigateMock.mock.calls[0][0] as string;
    expect(finalPath).toContain('appointmentType=no-preference');
    expect(finalPath).toContain('autoSearch=1');
  });

  it('goes back to the previous step', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NeedsQuestionnaire />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
  });
});
