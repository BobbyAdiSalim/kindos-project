import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendEmailByType = vi.fn();

vi.mock('../../services/email-strategy/index.js', () => ({
  sendEmailByType,
}));

describe('waitlistEmail utils', () => {
  beforeEach(() => {
    sendEmailByType.mockReset();
    sendEmailByType.mockResolvedValue(undefined);
  });

  it('sends waitlist auto-booked email with expected payload', async () => {
    const { sendWaitlistAutoBookedEmail } = await import('../../utils/waitlistEmail.js');

    await sendWaitlistAutoBookedEmail({
      to: 'patient@example.com',
      patientName: 'Pat',
      doctorName: 'Dr A',
      appointmentDate: '2026-04-01',
      appointmentStartTime: '09:00:00',
      appointmentEndTime: '09:30:00',
      appointmentType: 'virtual',
    });

    expect(sendEmailByType).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'waitlist-auto-booked',
        to: 'patient@example.com',
      })
    );
  });

  it('sends waitlist slot-opened email with expected payload', async () => {
    const { sendWaitlistSlotOpenedEmail } = await import('../../utils/waitlistEmail.js');

    await sendWaitlistSlotOpenedEmail({
      to: 'patient@example.com',
      patientName: 'Pat',
      doctorName: 'Dr A',
      appointmentDate: '2026-04-02',
      appointmentStartTime: '10:00:00',
      appointmentEndTime: '10:30:00',
      appointmentType: 'in-person',
    });

    expect(sendEmailByType).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'waitlist-slot-opened',
        to: 'patient@example.com',
      })
    );
  });
});
