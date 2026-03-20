const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

describe('notification transports', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMailMock.mockReset();
    createTransportMock.mockReset();
    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
    process.env.EMAIL_PROVIDER = '';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'pwd';
    process.env.EMAIL_FROM = '';
  });

  it('console transport logs expected output', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { default: consoleTransport } = await import('../../services/email-strategy/notification-transport/console-transport.js');

    await consoleTransport.send({
      to: 'to@example.com',
      subject: 'Sub',
      text: 'Body',
      label: 'Label',
    });

    expect(logSpy).toHaveBeenCalledWith('[Label]');
    expect(logSpy).toHaveBeenCalledWith('To: to@example.com');
    expect(logSpy).toHaveBeenCalledWith('Subject: Sub');
    expect(logSpy).toHaveBeenCalledWith('Body');

    logSpy.mockRestore();
  });

  it('smtp transport sends email and reuses transporter', async () => {
    const { default: smtpTransport } = await import('../../services/email-strategy/notification-transport/smtp-transport.js');

    await smtpTransport.send({
      to: 'to@example.com',
      subject: 'Hello',
      text: 'Text',
      html: '<p>x</p>',
    });
    await smtpTransport.send({
      to: 'to@example.com',
      subject: 'Hello 2',
      text: 'Text 2',
      html: '<p>y</p>',
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'user@example.com',
        to: 'to@example.com',
        subject: 'Hello',
      })
    );
  });

  it('transport factory selects smtp or falls back to console', async () => {
    process.env.EMAIL_PROVIDER = 'smtp';
    const { getNotificationTransport } = await import('../../services/email-strategy/notification-transport/transport-factory.js');
    const transport = getNotificationTransport();
    await transport.send({ to: 'a@example.com', subject: 'x' });
    expect(sendMailMock).toHaveBeenCalled();

    process.env.EMAIL_PROVIDER = 'unknown';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fallbackTransport = getNotificationTransport();
    await fallbackTransport.send({ to: 'b@example.com', subject: 'Fallback', text: 'Body' });
    expect(logSpy).toHaveBeenCalledWith('Subject: Fallback');
    logSpy.mockRestore();
  });
});
