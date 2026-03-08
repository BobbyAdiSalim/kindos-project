/* Factory Design Pattern and Strategy Design Pattern for Email Sending

Factory + Strategy design pattern is used here so that the logic of sending
emails will be encapsulated in one place and can be easily extended when 
we want to add. This ensure no repeated code and consistency for one 
functionality, i.e. sending emails (with different html body). 

Extensibility and Maintainability:
- Adding new email type can be done simply by adding new Strategy on strategies
  folder, following the given interface. Don't forget to import it here and modify STRATEGIES.
It improves extensibility and maintainability by letting you add or change 
email sending behavior in one place instead of updating many files.
*/

import doctorCancelledAppointmentEmailStrategy from './strategies/doctor-cancelled-appointment-email-strategy.js';
import doctorConfirmedAppointmentEmailStrategy from './strategies/doctor-confirmed-appointment-email-strategy.js';
import doctorRescheduleProposedEmailStrategy from './strategies/doctor-reschedule-proposed-email-strategy.js';
import doctorVerificationStatusUpdatedEmailStrategy from './strategies/doctor-verification-status-updated-email-strategy.js';
import passwordResetEmailStrategy from './strategies/password-reset-email-strategy.js';
import patientCancelledAppointmentEmailStrategy from './strategies/patient-cancelled-appointment-email-strategy.js';
import patientRescheduledAppointmentEmailStrategy from './strategies/patient-rescheduled-appointment-email-strategy.js';
import waitlistAutoBookedEmailStrategy from './strategies/waitlist-auto-booked-email-strategy.js';
import waitlistSlotOpenedEmailStrategy from './strategies/waitlist-slot-opened-email-strategy.js';

const STRATEGIES = {
  'password-reset': passwordResetEmailStrategy,
  'doctor-verification-status-updated': doctorVerificationStatusUpdatedEmailStrategy,
  'doctor-cancelled-appointment': doctorCancelledAppointmentEmailStrategy,
  'doctor-confirmed-appointment': doctorConfirmedAppointmentEmailStrategy,
  'doctor-reschedule-proposed': doctorRescheduleProposedEmailStrategy,
  'patient-cancelled-appointment': patientCancelledAppointmentEmailStrategy,
  'patient-rescheduled-appointment': patientRescheduledAppointmentEmailStrategy,
  'waitlist-auto-booked': waitlistAutoBookedEmailStrategy,
  'waitlist-slot-opened': waitlistSlotOpenedEmailStrategy,
};

export const getEmailStrategy = (type) => {
  const strategy = STRATEGIES[type];
  if (!strategy) {
    throw new Error(`Unsupported email strategy type: ${type}`);
  }

  return strategy;
};
