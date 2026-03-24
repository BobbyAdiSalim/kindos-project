import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel, EmptyChatPanel } from '@/app/components/chat/chat-panel';

const toastError = vi.fn();
const getChatDocumentUrlMock = vi.fn((connectionId: number, messageId: number) =>
  `/api/chat/messages/${connectionId}/document/${messageId}`
);

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('@/app/lib/chat-api', async () => {
  const actual = await vi.importActual('@/app/lib/chat-api');
  return {
    ...actual,
    getChatDocumentUrl: (connectionId: number, messageId: number) =>
      getChatDocumentUrlMock(connectionId, messageId),
  };
});

describe('ChatPanel', () => {
  beforeEach(() => {
    toastError.mockReset();
    getChatDocumentUrlMock.mockClear();
    vi.restoreAllMocks();
  });

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
        activeConnectionId={7}
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
        activeConnectionId={7}
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
        activeConnectionId={7}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders empty panel state', () => {
    render(<EmptyChatPanel />);
    expect(screen.getByText(/select a conversation/i)).toBeInTheDocument();
  });

  it('shows upload hint when file upload is allowed and there are no messages', () => {
    render(
      <ChatPanel
        contactName="Dr. Lin"
        messages={[]}
        currentUserId={20}
        messageInput=""
        onMessageInputChange={() => {}}
        onSend={() => {}}
        sending={false}
        activeConnectionId={7}
        allowFileUpload
      />
    );

    expect(screen.getByText(/cannot message you until you send the first message/i)).toBeInTheDocument();
    expect(screen.getByTitle(/attach a document/i)).toBeInTheDocument();
  });

  it('calls onSend on click when only pending file exists and clears pending file', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const onFileSelect = vi.fn();

    render(
      <ChatPanel
        contactName="Dr. Lin"
        messages={[]}
        currentUserId={20}
        messageInput="   "
        onMessageInputChange={() => {}}
        onSend={onSend}
        sending={false}
        activeConnectionId={7}
        allowFileUpload
        pendingFile={{ data: 'base64', name: 'report.pdf', type: 'application/pdf' }}
        onFileSelect={onFileSelect}
      />
    );

    const allButtons = screen.getAllByRole('button');
    await user.click(allButtons[0]);
    expect(onFileSelect).toHaveBeenCalledWith(null);

    await user.click(allButtons[allButtons.length - 1]);
    expect(onSend).toHaveBeenCalled();
  });

  it('does not send on Shift+Enter and maps file URL through getChatDocumentUrl', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(
      <ChatPanel
        contactName="Dr. Lin"
        messages={[
          {
            id: 11,
            sender_id: 20,
            content: 'Attached file',
            created_at: '2026-03-19T12:00:00.000Z',
            sender: { username: 'doctor' },
            file_url: '/raw/url',
            file_name: 'note.pdf',
          } as any,
        ]}
        currentUserId={20}
        messageInput="line"
        onMessageInputChange={() => {}}
        onSend={onSend}
        sending={false}
        activeConnectionId={44}
      />
    );

    await user.type(screen.getByPlaceholderText(/type a message/i), '{shift>}{enter}{/shift}');
    expect(onSend).not.toHaveBeenCalled();
    expect(getChatDocumentUrlMock).toHaveBeenCalledWith(44, 11);
  });

  it('rejects unsupported and oversized files', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ChatPanel
        contactName="Dr. Lin"
        messages={[]}
        currentUserId={20}
        messageInput=""
        onMessageInputChange={() => {}}
        onSend={() => {}}
        sending={false}
        activeConnectionId={7}
        allowFileUpload
        onFileSelect={vi.fn()}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const badTypeFile = new File(['abc'], 'bad.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [badTypeFile] } });
    expect(toastError).toHaveBeenCalledWith('Unsupported file type', expect.any(Object));

    const oversized = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversized, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [oversized] } });
    expect(toastError).toHaveBeenCalledWith('File too large', expect.any(Object));
  });

  it('reads valid file and calls onFileSelect', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: null | (() => void) = null;
      readAsDataURL(_file: File) {
        this.result = 'data:application/pdf;base64,QUJD';
        this.onload?.();
      }
    }

    vi.stubGlobal('FileReader', MockFileReader as any);

    const { container } = render(
      <ChatPanel
        contactName="Dr. Lin"
        messages={[]}
        currentUserId={20}
        messageInput=""
        onMessageInputChange={() => {}}
        onSend={() => {}}
        sending={false}
        activeConnectionId={7}
        allowFileUpload
        onFileSelect={onFileSelect}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    await user.upload(input, new File(['pdf'], 'report.pdf', { type: 'application/pdf' }));

    expect(onFileSelect).toHaveBeenCalledWith({
      data: 'data:application/pdf;base64,QUJD',
      name: 'report.pdf',
      type: 'application/pdf',
    });
  });

  it('triggers hidden file input click and forwards message input changes', async () => {
    const user = userEvent.setup();
    const onMessageInputChange = vi.fn();
    const inputClickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});

    render(
      <ChatPanel
        contactName="Dr. Lin"
        messages={[]}
        currentUserId={20}
        messageInput=""
        onMessageInputChange={onMessageInputChange}
        onSend={() => {}}
        sending={false}
        activeConnectionId={7}
        allowFileUpload
      />
    );

    await user.click(screen.getByTitle(/attach a document/i));
    expect(inputClickSpy).toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText(/type a message/i), 'hello');
    expect(onMessageInputChange).toHaveBeenCalled();
  });
});
