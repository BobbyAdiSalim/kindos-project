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

  it('covers password reset defaults and custom expiry branch', async () => {
    const { getEmailStrategy } = await import('../../services/email-strategy/email-strategy-factory.js');

    const passwordReset = getEmailStrategy('password-reset');

    const defaultExpiryPayload = passwordReset.build({
      resetLink: 'https://example.com/reset/default',
    });
    expect(defaultExpiryPayload.text).toContain('expires in 60 minutes');

    const customExpiryPayload = passwordReset.build({
      resetLink: 'https://example.com/reset/custom',
      expiresMinutes: 15,
    });
    expect(customExpiryPayload.text).toContain('expires in 15 minutes');
  });

  it('covers doctor verification dashboard link default and override', async () => {
    const { getEmailStrategy } = await import('../../services/email-strategy/email-strategy-factory.js');

    const verification = getEmailStrategy('doctor-verification-status-updated');

    const defaultPayload = verification.build();
    expect(defaultPayload.text).toContain('/doctor/dashboard');

    const customPayload = verification.build({
      dashboardLink: 'https://custom.example.com/doctor/home',
    });
    expect(customPayload.text).toContain('https://custom.example.com/doctor/home');
  });

  it('covers patient-facing strategy fallbacks for names and invalid date/time labels', async () => {
    const { getEmailStrategy } = await import('../../services/email-strategy/email-strategy-factory.js');

    const confirmed = getEmailStrategy('doctor-confirmed-appointment');
    const confirmedPayload = confirmed.build({
      appointmentDate: 'not-a-date',
      appointmentTime: 'not-a-time',
      appointmentType: 'virtual',
    });
    expect(confirmedPayload.text).toContain('Hi Patient');
    expect(confirmedPayload.text).toContain('with your provider');
    expect(confirmedPayload.text).toContain('not-a-date');
    expect(confirmedPayload.text).toContain('not-a-time');

    const slotOpened = getEmailStrategy('waitlist-slot-opened');
    const slotOpenedPayload = slotOpened.build({
      appointmentDate: 'bad-date',
      appointmentStartTime: 'bad-start',
      appointmentEndTime: 'bad-end',
      appointmentType: 'in-person',
    });
    expect(slotOpenedPayload.text).toContain('Hi Patient');
    expect(slotOpenedPayload.text).toContain('with your provider');
    expect(slotOpenedPayload.text).toContain('bad-date, bad-start-bad-end');

    const autoBooked = getEmailStrategy('waitlist-auto-booked');
    const autoBookedPayload = autoBooked.build({
      appointmentDate: 'bad-date-2',
      appointmentStartTime: 'bad-start-2',
      appointmentEndTime: 'bad-end-2',
      appointmentType: 'virtual',
    });
    expect(autoBookedPayload.text).toContain('Hi Patient');
    expect(autoBookedPayload.text).toContain('with your provider');
    expect(autoBookedPayload.text).toContain('bad-date-2, bad-start-2-bad-end-2');
  });

  it('covers doctor-facing strategy fallbacks for names and invalid date/time labels', async () => {
    const { getEmailStrategy } = await import('../../services/email-strategy/email-strategy-factory.js');

    const patientCancelled = getEmailStrategy('patient-cancelled-appointment');
    const cancelledPayload = patientCancelled.build({
      appointmentDate: 'bad-date',
      appointmentTime: 'bad-time',
      appointmentType: 'virtual',
    });
    expect(cancelledPayload.text).toContain('Hi Doctor');
    expect(cancelledPayload.text).toContain('a patient');
    expect(cancelledPayload.text).toContain('bad-date at bad-time');
    expect(cancelledPayload.html).toContain('Patient');

    const patientRescheduled = getEmailStrategy('patient-rescheduled-appointment');
    const rescheduledPayload = patientRescheduled.build({
      appointmentDate: 'bad-date-2',
      appointmentTime: 'bad-time-2',
      appointmentType: 'in-person',
    });
    expect(rescheduledPayload.text).toContain('Hi Doctor');
    expect(rescheduledPayload.text).toContain('a patient');
    expect(rescheduledPayload.text).toContain('bad-date-2 at bad-time-2');
    expect(rescheduledPayload.html).toContain('Patient');
  });

  it('covers undefined field fallbacks for remaining strategy branches', async () => {
    const { getEmailStrategy } = await import('../../services/email-strategy/email-strategy-factory.js');

    const doctorReschedule = getEmailStrategy('doctor-reschedule-proposed');
    const doctorReschedulePayload = doctorReschedule.build({
      appointmentId: undefined,
      appointmentDate: undefined,
      appointmentTime: undefined,
      appointmentType: undefined,
      patientName: undefined,
      doctorName: undefined,
    });
    expect(doctorReschedulePayload.text).toContain('Hi Patient');
    expect(doctorReschedulePayload.text).toContain('your provider proposed a new appointment time:');
    expect(doctorReschedulePayload.text).toContain(' at  (');

    const waitlistSlotOpened = getEmailStrategy('waitlist-slot-opened');
    const slotOpenedPayload = waitlistSlotOpened.build({
      patientName: undefined,
      doctorName: undefined,
      appointmentDate: undefined,
      appointmentStartTime: undefined,
      appointmentEndTime: undefined,
      appointmentType: undefined,
    });
    expect(slotOpenedPayload.text).toContain('Hi Patient');
    expect(slotOpenedPayload.text).toContain('with your provider opened up on , - (');

    const waitlistAutoBooked = getEmailStrategy('waitlist-auto-booked');
    const autoBookedPayload = waitlistAutoBooked.build({
      patientName: undefined,
      doctorName: undefined,
      appointmentDate: undefined,
      appointmentStartTime: undefined,
      appointmentEndTime: undefined,
      appointmentType: undefined,
    });
    expect(autoBookedPayload.text).toContain('Hi Patient');
    expect(autoBookedPayload.text).toContain('with your provider was reassigned to you from the waitlist on , - (');
  });
});
