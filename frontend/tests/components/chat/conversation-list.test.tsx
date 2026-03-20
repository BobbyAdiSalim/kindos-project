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
});
