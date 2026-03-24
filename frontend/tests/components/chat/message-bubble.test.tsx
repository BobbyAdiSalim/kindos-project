import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageBubble } from '@/app/components/chat/message-bubble';

const toastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('MessageBubble', () => {
  beforeEach(() => {
    toastError.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

  it('renders file attachment metadata', () => {
    render(
      <MessageBubble
        content={null}
        timestamp="2026-03-19T12:01:00.000Z"
        senderInitial="M"
        isMine
        fileName="report.pdf"
        fileSize={2048}
        fileType="application/pdf"
      />
    );

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('does not attempt download when url is missing', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn());

    render(
      <MessageBubble
        content={null}
        timestamp="2026-03-19T12:01:00.000Z"
        senderInitial="M"
        isMine={false}
        fileName="report.pdf"
        fileSize={2048}
        fileType="application/pdf"
        fileDownloadUrl={null}
      />
    );

    await user.click(screen.getByRole('button'));

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('downloads attached file successfully', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['file-data'], { type: 'application/pdf' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => blob })));
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:download-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    const anchorClick = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        (element as HTMLAnchorElement).click = anchorClick;
      }
      return element;
    });

    render(
      <MessageBubble
        content="Please review"
        timestamp="2026-03-19T12:01:00.000Z"
        senderInitial="M"
        isMine={false}
        fileName="report.pdf"
        fileSize={2048}
        fileType="application/pdf"
        fileDownloadUrl="/api/chat/messages/1/document/2"
      />
    );

    await user.click(screen.getByRole('button', { name: /report\.pdf/i }));

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/chat/messages/1/document/2', {
      credentials: 'include',
    });
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:download-url');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows toast on download failure', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

    render(
      <MessageBubble
        content={null}
        timestamp="2026-03-19T12:01:00.000Z"
        senderInitial="M"
        isMine={false}
        fileName="report.pdf"
        fileSize={2048}
        fileType="application/pdf"
        fileDownloadUrl="/api/chat/messages/1/document/2"
      />
    );

    await user.click(screen.getByRole('button'));

    expect(toastError).toHaveBeenCalledWith('Failed to download document');
  });
});
