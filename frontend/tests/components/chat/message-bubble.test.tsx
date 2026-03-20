import { render, screen } from '@testing-library/react';
import { MessageBubble } from '@/app/components/chat/message-bubble';

describe('MessageBubble', () => {
  it('renders content, sender initial, and timestamp', () => {
    render(
      <MessageBubble
        content="Hello patient"
        timestamp="2026-03-19T12:00:00.000Z"
        senderInitial="D"
        isMine={false}
      />
    );

    expect(screen.getByText('Hello patient')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('applies mine styling branch', () => {
    const { container } = render(
      <MessageBubble
        content="My message"
        timestamp="2026-03-19T12:01:00.000Z"
        senderInitial="M"
        isMine
      />
    );

    expect(container.textContent).toContain('My message');
  });
});
