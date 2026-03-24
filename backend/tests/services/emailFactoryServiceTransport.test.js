const sendMock = vi.fn();

vi.mock('../../services/email-strategy/notification-transport/transport-factory.js', () => ({
  getNotificationTransport: vi.fn(() => ({ send: sendMock })),
}));

describe('email factory and service', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
  });

  it('returns known strategy and throws for unknown type', async () => {
    const { getEmailStrategy } = await import('../../services/email-strategy/email-strategy-factory.js');

    const known = getEmailStrategy('password-reset');
    expect(known.type).toBe('password-reset');
    expect(() => getEmailStrategy('unsupported')).toThrow('Unsupported email strategy type: unsupported');
  });

  it('no-ops when recipient is missing', async () => {
    const { sendEmailByType } = await import('../../services/email-strategy/email-service.js');
    await sendEmailByType({ type: 'password-reset', to: '', data: { resetLink: 'x' } });

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('builds payload from strategy and sends through transport', async () => {
    const { sendEmailByType } = await import('../../services/email-strategy/email-service.js');

    await sendEmailByType({
      type: 'password-reset',
      to: 'patient@example.com',
      data: {
        resetLink: 'https://example.com/reset',
        expiresMinutes: 30,
      },
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'patient@example.com',
        subject: 'Reset your password',
        label: 'Password Reset Email',
      })
    );
  });
});
