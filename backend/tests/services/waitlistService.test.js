import { beforeEach, describe, expect, it, vi } from 'vitest';

const waitlistCount = vi.fn();
const waitlistFindOne = vi.fn();
const waitlistFindAll = vi.fn();
const waitlistCreate = vi.fn();
const patientFindOne = vi.fn();
const doctorFindOne = vi.fn();
const appointmentFindOne = vi.fn();
const appointmentCreate = vi.fn();
const patientFindByPk = vi.fn();
const doctorFindByPk = vi.fn();
const messageCreate = vi.fn();

vi.mock('../../models/index.js', () => ({
  WaitlistEntry: {
    count: waitlistCount,
    findOne: waitlistFindOne,
    findAll: waitlistFindAll,
    create: waitlistCreate,
  },
  Patient: {
    findOne: patientFindOne,
    findByPk: patientFindByPk,
  },
  Doctor: {
    findOne: doctorFindOne,
    findByPk: doctorFindByPk,
  },
  User: {},
  Message: { create: messageCreate },
  Appointment: {
    findOne: appointmentFindOne,
    create: appointmentCreate,
  },
}));

describe('WaitlistService', () => {
  beforeEach(() => {
    vi.resetModules();
    waitlistCount.mockReset();
    waitlistFindOne.mockReset();
    waitlistFindAll.mockReset();
    waitlistCreate.mockReset();
    patientFindOne.mockReset();
    doctorFindOne.mockReset();
    appointmentFindOne.mockReset();
    appointmentCreate.mockReset();
    patientFindByPk.mockReset();
    doctorFindByPk.mockReset();
    messageCreate.mockReset();
  });

  it('validateJoinPayload rejects invalid doctor_user_id', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');

    expect(() => waitlistService.validateJoinPayload({})).toThrow('Valid doctor_user_id is required.');
  });

  it('validateJoinPayload rejects invalid appointment_type', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');

    expect(() => waitlistService.validateJoinPayload({
      doctor_user_id: 2,
      desired_date: '2099-01-01',
      desired_start_time: '10:00',
      desired_end_time: '10:30',
      appointment_type: 'phone',
    })).toThrow('appointment_type must be either "virtual" or "in-person".');
  });

  it('getQueueMetricsForEntry returns nulls for non-active entries', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');
    const metrics = await waitlistService.getQueueMetricsForEntry({ status: 'removed' });

    expect(metrics).toEqual({ queuePosition: null, queueCount: null });
  });

  it('getPatientByUserId throws 404 when profile missing', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');
    patientFindOne.mockResolvedValue(null);

    await expect(waitlistService.getPatientByUserId(7)).rejects.toMatchObject({ status: 404 });
  });

  it('joinWaitlist rejects when slot is currently available', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');

    patientFindOne.mockResolvedValue({ id: 10, user_id: 7 });
    doctorFindOne.mockResolvedValue({ id: 22, user_id: 9, verification_status: 'approved' });
    appointmentFindOne.mockResolvedValue(null);

    await expect(waitlistService.joinWaitlist({
      patientUserId: 7,
      payload: {
        doctor_user_id: 9,
        desired_date: '2099-01-01',
        desired_start_time: '10:00',
        desired_end_time: '10:30',
        appointment_type: 'virtual',
      },
      transaction: {},
    })).rejects.toMatchObject({ status: 409 });
  });

  it('notifyPatientsForCancellation returns zero when no active entries exist', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');

    waitlistFindAll.mockResolvedValue([]);

    const result = await waitlistService.notifyPatientsForCancellation({
      doctorId: 2,
      appointmentDate: '2099-01-01',
      appointmentStartTime: '10:00:00',
      appointmentEndTime: '10:30:00',
      appointmentType: 'virtual',
      cancelledAppointmentId: 15,
      transaction: {},
    });

    expect(result).toEqual({ notifiedCount: 0 });
  });

  it('joinWaitlist reactivates existing entry', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');

    patientFindOne.mockResolvedValue({ id: 10, user_id: 7 });
    doctorFindOne.mockResolvedValue({ id: 22, user_id: 9, verification_status: 'approved' });
    appointmentFindOne.mockResolvedValue({ id: 33, patient_id: 999 });

    const saveMock = vi.fn().mockResolvedValue(undefined);
    waitlistFindOne.mockResolvedValue({
      id: 50,
      status: 'removed',
      doctor_id: 22,
      desired_date: '2099-01-01',
      desired_start_time: '10:00:00',
      desired_end_time: '10:30:00',
      appointment_type: 'virtual',
      created_at: new Date(),
      save: saveMock,
      setDataValue: vi.fn(),
    });
    waitlistCount.mockResolvedValue(1);

    const result = await waitlistService.joinWaitlist({
      patientUserId: 7,
      payload: {
        doctor_user_id: 9,
        desired_date: '2099-01-01',
        desired_start_time: '10:00',
        desired_end_time: '10:30',
        appointment_type: 'virtual',
      },
      transaction: {},
    });

    expect(saveMock).toHaveBeenCalled();
    expect(result.id).toBe(50);
  });

  it('removeMyEntry marks entry as removed', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');

    patientFindOne.mockResolvedValue({ id: 10, user_id: 7 });
    const saveMock = vi.fn().mockResolvedValue(undefined);
    waitlistFindOne.mockResolvedValue({ id: 61, status: 'active', save: saveMock });

    const result = await waitlistService.removeMyEntry({
      patientUserId: 7,
      waitlistEntryId: 61,
      transaction: {},
    });

    expect(saveMock).toHaveBeenCalled();
    expect(result.status).toBe('removed');
  });

  it('fulfillWaitlistForCancelledAppointment returns not assigned when next entry missing', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');

    waitlistFindOne.mockResolvedValue(null);

    const result = await waitlistService.fulfillWaitlistForCancelledAppointment({
      cancelledAppointment: {
        id: 1,
        doctor_id: 2,
        slot_id: 3,
        appointment_date: '2099-01-01',
        start_time: '10:00:00',
        end_time: '10:30:00',
        appointment_type: 'virtual',
      },
      cancelledByUserId: 100,
      transaction: { LOCK: { UPDATE: 'UPDATE' } },
    });

    expect(result).toEqual({ assigned: false });
  });

  it('fulfillWaitlistForCancelledAppointment assigns next waitlist entry', async () => {
    const { default: waitlistService } = await import('../../services/WaitlistService.js');

    const nextEntrySave = vi.fn().mockResolvedValue(undefined);
    waitlistFindOne
      .mockResolvedValueOnce({
        id: 80,
        patient_id: 15,
        doctor_id: 2,
        status: 'active',
        save: nextEntrySave,
      })
      .mockResolvedValueOnce(null);

    appointmentFindOne.mockResolvedValueOnce(null);
    appointmentCreate.mockResolvedValue({ id: 501 });
    patientFindByPk.mockResolvedValue({ user: { id: 15 } });
    doctorFindByPk.mockResolvedValue({ user: { id: 25 } });
    messageCreate.mockResolvedValue({ id: 700 });

    const result = await waitlistService.fulfillWaitlistForCancelledAppointment({
      cancelledAppointment: {
        id: 1,
        doctor_id: 2,
        slot_id: 3,
        appointment_date: '2099-01-01',
        start_time: '10:00:00',
        end_time: '10:30:00',
        appointment_type: 'virtual',
      },
      cancelledByUserId: 25,
      transaction: { LOCK: { UPDATE: 'UPDATE' } },
    });

    expect(result).toEqual(expect.objectContaining({ assigned: true, waitlistEntryId: 80 }));
    expect(appointmentCreate).toHaveBeenCalled();
    expect(nextEntrySave).toHaveBeenCalled();
  });
});
