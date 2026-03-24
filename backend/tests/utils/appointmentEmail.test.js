import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendEmailByType = vi.fn();

vi.mock('../../services/email-strategy/index.js', () => ({
  sendEmailByType,
}));

describe('appointment email helpers', () => {
  beforeEach(() => {
    sendEmailByType.mockReset();
    sendEmailByType.mockResolvedValue(undefined);
  });

  it('sends doctor cancellation email', async () => {
    const { sendDoctorCancellationEmail } = await import('../../utils/appointmentEmail.js');

    await sendDoctorCancellationEmail({
      to: 'patient@example.com',
      patientName: 'Pat',
      doctorName: 'Dr A',
      appointmentDate: '2026-04-10',
      appointmentTime: '13:00:00',
      appointmentType: 'virtual',
      declineReason: 'Schedule conflict',
    });

    expect(sendEmailByType).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'doctor-cancelled-appointment', to: 'patient@example.com' })
    );
  });

  it('sends approval and reschedule emails', async () => {
    const {
      sendDoctorApprovalEmail,
      sendDoctorRescheduleEmailToPatient,
    } = await import('../../utils/appointmentEmail.js');

    await sendDoctorApprovalEmail({
      to: 'patient@example.com',
      patientName: 'Pat',
      doctorName: 'Dr A',
      appointmentDate: '2026-04-10',
      appointmentTime: '13:00:00',
      appointmentType: 'virtual',
    });

    await sendDoctorRescheduleEmailToPatient({
      to: 'patient@example.com',
      patientName: 'Pat',
      doctorName: 'Dr A',
      appointmentId: 77,
      appointmentDate: '2026-04-11',
      appointmentTime: '15:00:00',
      appointmentType: 'in-person',
    });

    expect(sendEmailByType).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'doctor-confirmed-appointment' })
    );
    expect(sendEmailByType).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'doctor-reschedule-proposed' })
    );
  });

  it('sends patient cancellation and reschedule notifications to doctor', async () => {
    const {
      sendPatientCancellationEmailToDoctor,
      sendPatientRescheduleEmailToDoctor,
    } = await import('../../utils/appointmentEmail.js');

    await sendPatientCancellationEmailToDoctor({
      to: 'doctor@example.com',
      doctorName: 'Dr A',
      patientName: 'Pat',
      appointmentDate: '2026-04-10',
      appointmentTime: '13:00:00',
      appointmentType: 'virtual',
    });

    await sendPatientRescheduleEmailToDoctor({
      to: 'doctor@example.com',
      doctorName: 'Dr A',
      patientName: 'Pat',
      appointmentDate: '2026-04-11',
      appointmentTime: '16:00:00',
      appointmentType: 'in-person',
    });

    expect(sendEmailByType).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'patient-cancelled-appointment' })
    );
    expect(sendEmailByType).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'patient-rescheduled-appointment' })
    );
  });
});
