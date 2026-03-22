const appointmentFindOne = vi.fn();
const doctorFindOne = vi.fn();
const patientFindOne = vi.fn();
const availabilityPatternFindAll = vi.fn();
const availabilitySlotFindAll = vi.fn();

vi.mock('../../models/index.js', () => ({
  Appointment: { findOne: appointmentFindOne },
  Doctor: { findOne: doctorFindOne },
  Patient: { findOne: patientFindOne },
  User: {},
  AvailabilityPattern: { findAll: availabilityPatternFindAll },
  AvailabilitySlot: { findAll: availabilitySlotFindAll },
}));

describe('booking shared helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
    appointmentFindOne.mockReset();
    doctorFindOne.mockReset();
    patientFindOne.mockReset();
    availabilityPatternFindAll.mockReset();
    availabilitySlotFindAll.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes and validates times', async () => {
    const { normalizeTime, timeToMinutes, isFutureDateTime } = await import('../../controllers/booking/bookingShared.js');

    expect(normalizeTime('09:15')).toBe('09:15:00');
    expect(normalizeTime('09:15:59')).toBe('09:15:59');
    expect(normalizeTime('not-time')).toBe('');
    expect(timeToMinutes('10:45:00')).toBe(645);

    expect(isFutureDateTime('2026-03-16', '09:00:00')).toBe(true);
    expect(isFutureDateTime('2026-03-10', '09:00:00')).toBe(false);
  });

  it('validates booking payload and computes duration', async () => {
    const { validateBookingPayload } = await import('../../controllers/booking/bookingShared.js');

    const payload = validateBookingPayload({
      doctor_user_id: 7,
      appointment_date: '2026-03-20',
      start_time: '09:00',
      end_time: '10:30',
      appointment_type: 'virtual',
      reason: 'Follow up',
      notes: 'Bring tests',
      accessibility_needs: ['captions', '  '],
      notify_on_doctor_approval: false,
    });

    expect(payload.duration).toBe(90);
    expect(payload.accessibilityNeeds).toEqual(['captions']);
    expect(payload.notifyOnDoctorApproval).toBe(false);
  });

  it('throws HttpError for invalid booking payload values', async () => {
    const { validateBookingPayload } = await import('../../controllers/booking/bookingShared.js');

    expect(() => validateBookingPayload({})).toThrow('Valid doctor_user_id is required.');
    expect(() => validateBookingPayload({ doctor_user_id: 1, appointment_date: 'x' })).toThrow('Valid appointment_date is required');
    expect(() => validateBookingPayload({ doctor_user_id: 1, appointment_date: '2026-03-20', start_time: '10:00', end_time: '09:00' })).toThrow('start_time must be earlier than end_time.');
    expect(() => validateBookingPayload({ doctor_user_id: 1, appointment_date: '2026-03-20', start_time: '09:00', end_time: '10:00', appointment_type: 'phone', reason: 'x' })).toThrow('appointment_type must be either');
    expect(() => validateBookingPayload({ doctor_user_id: 1, appointment_date: '2026-03-20', start_time: '09:00', end_time: '10:00', appointment_type: 'virtual', reason: '' })).toThrow('reason is required.');
    expect(() => validateBookingPayload({ doctor_user_id: 1, appointment_date: '2026-03-20', start_time: '09:00', end_time: '10:00', appointment_type: 'virtual', reason: 'x', notify_on_doctor_approval: 'yes' })).toThrow('notify_on_doctor_approval must be a boolean.');
    expect(() => validateBookingPayload({ doctor_user_id: 1, appointment_date: '2026-03-10', start_time: '09:00', end_time: '10:00', appointment_type: 'virtual', reason: 'x' })).toThrow('Appointment time must be in the future.');
  });

  it('validates slot-selection payload', async () => {
    const { validateSlotSelectionPayload } = await import('../../controllers/booking/bookingShared.js');

    const parsed = validateSlotSelectionPayload({
      appointment_date: '2026-03-20',
      start_time: '09:00',
      end_time: '10:00',
      appointment_type: 'in-person',
    });

    expect(parsed).toEqual(
      expect.objectContaining({
        appointmentType: 'in-person',
        duration: 60,
      })
    );

    expect(() => validateSlotSelectionPayload({ appointment_date: 'bad' })).toThrow('Valid appointment_date is required');
  });

  it('serializes appointment with rejection and pending reschedule details', async () => {
    const {
      serializeAppointment,
      hasPendingReschedule,
      clearPendingReschedule,
      getDoctorRejectionReasonLabel,
    } = await import('../../controllers/booking/bookingShared.js');

    const appointment = {
      id: 1,
      appointment_date: '2026-03-20',
      start_time: '09:00:00',
      end_time: '09:30:00',
      appointment_type: 'virtual',
      status: 'cancelled',
      duration: 30,
      reason: 'Reason',
      notes: null,
      accessibility_needs: null,
      summary: null,
      summary_written_at: null,
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: 'Declined by doctor: clinic unavailable',
      doctor_rejection_reason_code: 'clinic_unavailable',
      doctor_rejection_reason_note: 'n/a',
      notify_on_doctor_approval: true,
      pending_reschedule_date: '2026-03-25',
      pending_reschedule_start_time: '10:00:00',
      pending_reschedule_end_time: '10:30:00',
      pending_reschedule_type: 'virtual',
      pending_reschedule_duration: 30,
      pending_reschedule_requested_by_role: 'doctor',
      pending_reschedule_previous_status: 'confirmed',
      pending_reschedule_requested_at: '2026-03-15T00:00:00.000Z',
      doctor: {
        id: 10,
        user_id: 20,
        full_name: 'Dr Test',
        specialty: 'ENT',
        clinic_location: 'Clinic',
        time_zone: 'America/New_York',
        virtual_available: true,
        in_person_available: true,
        user: { username: 'doc' },
      },
      patient: {
        id: 30,
        user_id: 40,
        full_name: 'Patient',
        user: { username: 'pat' },
      },
      created_at: 'x',
      updated_at: 'y',
    };

    expect(hasPendingReschedule(appointment)).toBe(true);
    expect(getDoctorRejectionReasonLabel('clinic_unavailable')).toBe('Clinic unavailable');

    const serialized = serializeAppointment(appointment);
    expect(serialized.declined_by_doctor).toBe(true);
    expect(serialized.pending_reschedule).toEqual(expect.objectContaining({ requested_by_role: 'doctor' }));
    expect(serialized.doctor).toEqual(expect.objectContaining({ username: 'doc' }));

    clearPendingReschedule(appointment);
    expect(hasPendingReschedule(appointment)).toBe(false);
  });

  it('checks slot bookability against patterns and overrides', async () => {
    const { ensureSlotIsBookable } = await import('../../controllers/booking/bookingShared.js');
    availabilityPatternFindAll.mockResolvedValue([
      {
        start_time: '09:00:00',
        end_time: '10:00:00',
        appointment_duration: 30,
        appointment_type: ['virtual', 'in-person'],
      },
    ]);
    availabilitySlotFindAll.mockResolvedValue([
      {
        id: 88,
        is_available: true,
        start_time: '09:30:00',
        end_time: '10:00:00',
        appointment_type: ['virtual'],
      },
    ]);

    const slotId = await ensureSlotIsBookable({
      transaction: {},
      doctorId: 9,
      doctorProfile: { virtual_available: true, in_person_available: true },
      appointmentDate: '2026-03-16',
      startTime: '09:30:00',
      endTime: '10:00:00',
      appointmentType: 'virtual',
    });

    expect(slotId).toBe(88);

    await expect(
      ensureSlotIsBookable({
        transaction: {},
        doctorId: 9,
        doctorProfile: { virtual_available: false, in_person_available: true },
        appointmentDate: '2026-03-16',
        startTime: '09:30:00',
        endTime: '10:00:00',
        appointmentType: 'virtual',
      })
    ).rejects.toMatchObject({ message: 'Doctor is not accepting virtual appointments.' });
  });

  it('loads doctor/patient profiles and checks overlap conflicts', async () => {
    const {
      getDoctorForBooking,
      getPatientForUser,
      ensureNoOverlappingAppointment,
    } = await import('../../controllers/booking/bookingShared.js');

    const lock = { UPDATE: 'update' };
    const tx = { LOCK: lock };

    doctorFindOne.mockResolvedValueOnce({ id: 7 });
    patientFindOne.mockResolvedValueOnce({ id: 9 });
    appointmentFindOne.mockResolvedValueOnce({ id: 99 });

    await expect(getDoctorForBooking(10, tx)).resolves.toEqual({ id: 7 });
    await expect(getPatientForUser(11, tx)).resolves.toEqual({ id: 9 });

    await expect(
      ensureNoOverlappingAppointment({
        transaction: tx,
        doctorId: 7,
        appointmentDate: '2026-03-20',
        startTime: '09:00:00',
        endTime: '09:30:00',
      })
    ).rejects.toMatchObject({ status: 409 });

    doctorFindOne.mockResolvedValueOnce(null);
    patientFindOne.mockResolvedValueOnce(null);
    appointmentFindOne.mockResolvedValueOnce(null);

    await expect(getDoctorForBooking(10, tx)).rejects.toMatchObject({ status: 404 });
    await expect(getPatientForUser(11, tx)).rejects.toMatchObject({ status: 404 });

    await expect(
      ensureNoOverlappingAppointment({
        transaction: tx,
        doctorId: 7,
        appointmentDate: '2026-03-20',
        startTime: '09:00:00',
        endTime: '09:30:00',
        excludeAppointmentId: 50,
      })
    ).resolves.toBeUndefined();
  });
});
