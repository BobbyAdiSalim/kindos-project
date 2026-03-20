describe('email strategies', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('builds payload for each supported strategy type', async () => {
    const { getEmailStrategy } = await import('../../services/email-strategy/email-strategy-factory.js');

    const baseData = {
      patientName: 'Pat',
      doctorName: 'Dr. Who',
      appointmentDate: '2026-03-20',
      appointmentTime: '13:30:00',
      appointmentStartTime: '13:30:00',
      appointmentEndTime: '14:00:00',
      appointmentType: 'virtual',
      appointmentId: 99,
      resetLink: 'https://example.com/reset-token',
      dashboardLink: 'https://example.com/doctor/dashboard',
      expiresMinutes: 30,
      declineReason: 'Emergency',
    };

    const supportedTypes = [
      'password-reset',
      'doctor-verification-status-updated',
      'doctor-cancelled-appointment',
      'doctor-confirmed-appointment',
      'doctor-reschedule-proposed',
      'patient-cancelled-appointment',
      'patient-rescheduled-appointment',
      'waitlist-auto-booked',
      'waitlist-slot-opened',
    ];

    for (const type of supportedTypes) {
      const strategy = getEmailStrategy(type);
      const payload = strategy.build(baseData);

      expect(strategy.type).toBe(type);
      expect(strategy.getLabel()).toEqual(expect.any(String));
      expect(payload.subject).toEqual(expect.any(String));
      expect(payload.text).toEqual(expect.any(String));
      expect(payload.html).toEqual(expect.any(String));
      expect(payload.html).toContain('<table role="presentation"');
    }
  });

  it('uses fallback values when optional fields are missing', async () => {
    const { getEmailStrategy } = await import('../../services/email-strategy/email-strategy-factory.js');

    const doctorCancelled = getEmailStrategy('doctor-cancelled-appointment');
    const cancellationPayload = doctorCancelled.build({
      appointmentDate: 'bad-date',
      appointmentTime: 'bad-time',
      appointmentType: 'in-person',
    });
    expect(cancellationPayload.text).toContain('Patient');
    expect(cancellationPayload.text).toContain('your provider');

    const reschedule = getEmailStrategy('doctor-reschedule-proposed');
    const reschedulePayload = reschedule.build({
      patientName: 'P',
      doctorName: 'D',
      appointmentDate: '2026-03-20',
      appointmentTime: '13:00:00',
      appointmentType: 'virtual',
      appointmentId: 'not-an-int',
    });
    expect(reschedulePayload.text).toContain('/patient/dashboard');
  });
});
