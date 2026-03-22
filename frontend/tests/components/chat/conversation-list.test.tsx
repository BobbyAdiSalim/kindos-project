import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationList } from '@/app/components/chat/conversation-list';

describe('ConversationList', () => {
  it('renders empty state message', () => {
    render(
      <ConversationList
        connections={[]}
        activeConnectionId={null}
        onSelect={() => {}}
        contactRole="doctor"
        emptyMessage="No active chats"
      />
    );

    expect(screen.getByText('No active chats')).toBeInTheDocument();
  });

  it('renders conversations and handles select', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const connection = {
      id: 2,
      unreadCount: 3,
      lastMessage: { content: 'Hello there' },
      doctor: { full_name: 'Dr. Lin', specialty: 'ENT' },
    } as any;

    render(
      <ConversationList
        connections={[connection]}
        activeConnectionId={2}
        onSelect={onSelect}
        contactRole="doctor"
      />
    );

    expect(screen.getByText('Dr. Lin')).toBeInTheDocument();
    expect(screen.getByText('ENT')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dr\. lin/i }));
    expect(onSelect).toHaveBeenCalledWith(connection);
  });

  it('sorts by lastMessage time and falls back to patient label', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const older = {
      id: 1,
      created_at: '2026-03-19T10:00:00.000Z',
      unreadCount: 0,
      patient: { full_name: '' },
      lastMessage: null,
    } as any;
    const newer = {
      id: 2,
      created_at: '2026-03-19T09:00:00.000Z',
      unreadCount: 0,
      patient: { full_name: 'Pat Lee' },
      lastMessage: {
        content: 'Most recent',
        created_at: '2026-03-20T09:00:00.000Z',
      },
    } as any;

    render(
      <ConversationList
        connections={[older, newer]}
        activeConnectionId={null}
        onSelect={onSelect}
        contactRole="patient"
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Pat Lee');
    expect(buttons[0]).toHaveTextContent('Most recent');
    expect(buttons[1]).toHaveTextContent('Patient');
    expect(screen.queryByText('0')).not.toBeInTheDocument();

    await user.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith(newer);
  });

  it('uses doctor fallback name and hides subtitle for patient role', () => {
    const connection = {
      id: 3,
      created_at: '2026-03-19T12:00:00.000Z',
      unreadCount: 1,
      doctor: { full_name: '' },
      patient: { full_name: 'Patient Name' },
    } as any;

    render(
      <ConversationList
        connections={[connection]}
        activeConnectionId={null}
        onSelect={() => {}}
        contactRole="doctor"
      />
    );

    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.queryByText('Patient Name')).not.toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
