import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel, EmptyChatPanel } from '@/app/components/chat/chat-panel';

describe('ChatPanel', () => {
  it('renders messages and sends on Enter', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const onMessageInputChange = vi.fn();

    render(
      <ChatPanel
        contactName="Dr. Lin"
        contactSubtitle="ENT"
        messages={[
          {
            id: 1,
            sender_id: 10,
            content: 'Hello',
            created_at: '2026-03-19T12:00:00.000Z',
            sender: { username: 'doctor' },
          } as any,
        ]}
        currentUserId={20}
        messageInput="Hi"
        onMessageInputChange={onMessageInputChange}
        onSend={onSend}
        sending={false}
      />
    );

    expect(screen.getByText('Dr. Lin')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/type a message/i), '{enter}');
    expect(onSend).toHaveBeenCalled();
  });

  it('disables send button when input is blank or sending', () => {
    const { rerender } = render(
      <ChatPanel
        contactName="Dr. Lin"
        messages={[]}
        currentUserId={20}
        messageInput="   "
        onMessageInputChange={() => {}}
        onSend={() => {}}
        sending={false}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();

    rerender(
      <ChatPanel
        contactName="Dr. Lin"
        messages={[]}
        currentUserId={20}
        messageInput="hello"
        onMessageInputChange={() => {}}
        onSend={() => {}}
        sending
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders empty panel state', () => {
    render(<EmptyChatPanel />);
    expect(screen.getByText(/select a conversation/i)).toBeInTheDocument();
  });
});
