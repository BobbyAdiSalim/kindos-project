import { describe, expect, it } from 'vitest';

import doctorCancelled from '../../services/email-strategy/strategies/doctor-cancelled-appointment-email-strategy.js';
import doctorConfirmed from '../../services/email-strategy/strategies/doctor-confirmed-appointment-email-strategy.js';
import doctorReschedule from '../../services/email-strategy/strategies/doctor-reschedule-proposed-email-strategy.js';
import doctorVerification from '../../services/email-strategy/strategies/doctor-verification-status-updated-email-strategy.js';
import passwordReset from '../../services/email-strategy/strategies/password-reset-email-strategy.js';
import patientCancelled from '../../services/email-strategy/strategies/patient-cancelled-appointment-email-strategy.js';
import patientRescheduled from '../../services/email-strategy/strategies/patient-rescheduled-appointment-email-strategy.js';
import waitlistAutoBooked from '../../services/email-strategy/strategies/waitlist-auto-booked-email-strategy.js';
import waitlistSlotOpened from '../../services/email-strategy/strategies/waitlist-slot-opened-email-strategy.js';

const strategies = [
  doctorCancelled,
  doctorConfirmed,
  doctorReschedule,
  doctorVerification,
  passwordReset,
  patientCancelled,
  patientRescheduled,
  waitlistAutoBooked,
  waitlistSlotOpened,
];

describe('email strategy files smoke', () => {
  it.each(strategies)('exports a strategy object with required shape: %s', (strategy) => {
    expect(strategy).toBeDefined();
    expect(typeof strategy.type).toBe('string');
    expect(typeof strategy.getLabel).toBe('function');
    expect(typeof strategy.build).toBe('function');
  });
});
