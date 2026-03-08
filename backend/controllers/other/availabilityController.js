/**
 * Availability Controller
 * Handles doctor availability management - both recurring patterns and specific slots
 */

import { AvailabilityPattern, AvailabilitySlot } from '../../models/Availability.js';
import Doctor from '../../models/Doctor.js';
import Appointment from '../../models/Appointment.js';
import Review from '../../models/Review.js';
import sequelize from '../../config/database.js';
import { Op } from 'sequelize';
import { buildAvailabilityFilterClauses } from '../../services/availability-builder/index.js';

const ALLOWED_DURATIONS = [30, 60];
const ALLOWED_APPOINTMENT_TYPES = ['virtual', 'in-person'];

function isValidDuration(d) {
  return ALLOWED_DURATIONS.includes(Number(d));
}

function isValidTimeFormat(t) {
  return typeof t === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(t);
}

function isValidAppointmentType(types) {
  return (
    Array.isArray(types) &&
    types.length > 0 &&
    types.every((t) => ALLOWED_APPOINTMENT_TYPES.includes(t))
  );
}

/**
 * Convert a time string ("HH:MM:SS" or "HH:MM") to minutes since midnight.
 */
function timeToMinutes(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function isFutureDateTime(dateStr, timeStr) {
  const dateTime = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(dateTime.getTime())) return false;
  return dateTime.getTime() > Date.now();
}

/**
 * Convert minutes since midnight to "HH:MM" string.
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Generate individual time slot objects from a pattern's time range and duration.
 * e.g., 09:00-17:00 with 30min duration → [{startTime:"09:00", endTime:"09:30"}, ...]
 */
function generateTimeSlotsFromPattern(startTime, endTime, durationMinutes, appointmentTypes) {
  const slots = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  let current = startMinutes;
  while (current + durationMinutes <= endMinutes) {
    slots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + durationMinutes),
      appointmentTypes: appointmentTypes || ['virtual', 'in-person'],
    });
    current += durationMinutes;
  }
  return slots;
}

/**
 * Apply AvailabilitySlot overrides to generated slots.
 * - is_available=false: remove generated slots that overlap with the override range
 * - is_available=true: add as extra bookable slots
 */
function applySlotOverrides(generatedSlots, specificSlots) {
  const unavailableRanges = specificSlots
    .filter((s) => !s.is_available)
    .map((s) => ({
      start: timeToMinutes(s.start_time),
      end: timeToMinutes(s.end_time),
    }));

  let filtered = generatedSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    return !unavailableRanges.some(
      (range) => slotStart < range.end && slotEnd > range.start
    );
  });

  const extraSlots = specificSlots
    .filter((s) => s.is_available)
    .flatMap((s) =>
      generateTimeSlotsFromPattern(
        s.start_time,
        s.end_time,
        s.appointment_duration || 30,
        s.appointment_type || ['virtual', 'in-person']
      )
    );

  return [...filtered, ...extraSlots];
}

/**
 * Find an overlapping appointment for a slot, if one exists.
 */
function getOverlappingAppointment(slot, appointments) {
  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);

  return appointments.find((appt) => {
    const apptStart = timeToMinutes(appt.start_time);
    const apptEnd = timeToMinutes(appt.end_time);
    return slotStart < apptEnd && slotEnd > apptStart;
  });
}

/**
 * Get doctor's availability patterns (recurring weekly schedule)
 * @route   GET /api/availability/patterns
 * @access  Private (Doctor only)
 */
export const getAvailabilityPatterns = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Find the doctor record
    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const patterns = await AvailabilityPattern.findAll({
      where: { doctor_id: doctor.id },
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
    });

    res.json({ patterns });
  } catch (error) {
    console.error('Error fetching availability patterns:', error);
    res.status(500).json({ message: 'Failed to fetch availability patterns' });
  }
};

/**
 * Create or update availability patterns (recurring weekly schedule)
 * @route   POST /api/availability/patterns
 * @access  Private (Doctor only)
 */
export const setAvailabilityPatterns = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { patterns } = req.body;

    if (!patterns || !Array.isArray(patterns)) {
      return res.status(400).json({ message: 'Invalid patterns data' });
    }

    for (const p of patterns) {
      const dow = Number(p.day_of_week);
      if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
        return res.status(400).json({ message: `Invalid day_of_week "${p.day_of_week}": must be 0 (Sun) – 6 (Sat)` });
      }
      if (!isValidTimeFormat(p.start_time) || !isValidTimeFormat(p.end_time)) {
        return res.status(400).json({ message: 'Invalid time format — expected HH:MM' });
      }
      if (timeToMinutes(p.start_time) >= timeToMinutes(p.end_time)) {
        return res.status(400).json({ message: 'start_time must be before end_time' });
      }
      const dur = p.appointment_duration ?? 30;
      if (!isValidDuration(dur)) {
        return res.status(400).json({
          message: `Invalid appointment_duration "${dur}": must be one of ${ALLOWED_DURATIONS.join(', ')} minutes`,
        });
      }
      if (p.appointment_type !== undefined && !isValidAppointmentType(p.appointment_type)) {
        return res.status(400).json({
          message: `Invalid appointment_type: must be a non-empty array containing only ${ALLOWED_APPOINTMENT_TYPES.join(', ')}`,
        });
      }
    }

    // Find the doctor record
    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    // Delete and recreate patterns atomically
    const createdPatterns = await sequelize.transaction(async (transaction) => {
      await AvailabilityPattern.destroy({ where: { doctor_id: doctor.id }, transaction });

      return Promise.all(
        patterns.map((pattern) =>
          AvailabilityPattern.create({
            doctor_id: doctor.id,
            day_of_week: pattern.day_of_week,
            start_time: pattern.start_time,
            end_time: pattern.end_time,
            appointment_duration: pattern.appointment_duration || 30,
            appointment_type: pattern.appointment_type || ['virtual', 'in-person'],
            is_active: pattern.is_active !== false,
          }, { transaction })
        )
      );
    });

    res.json({
      message: 'Availability patterns updated successfully',
      patterns: createdPatterns,
    });
  } catch (error) {
    console.error('Error setting availability patterns:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Duplicate pattern: same day and start time already exists' });
    }
    res.status(500).json({ message: 'Failed to update availability patterns' });
  }
};

/**
 * Delete a specific availability pattern
 * @route   DELETE /api/availability/patterns/:patternId
 * @access  Private (Doctor only)
 */
export const deleteAvailabilityPattern = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { patternId } = req.params;

    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const pattern = await AvailabilityPattern.findOne({
      where: { id: patternId, doctor_id: doctor.id },
    });

    if (!pattern) {
      return res.status(404).json({ message: 'Pattern not found' });
    }

    await pattern.destroy();
    res.json({ message: 'Pattern deleted successfully' });
  } catch (error) {
    console.error('Error deleting pattern:', error);
    res.status(500).json({ message: 'Failed to delete pattern' });
  }
};

/**
 * Get doctor's specific availability slots
 * @route   GET /api/availability/slots
 * @access  Private (Doctor only)
 */
export const getAvailabilitySlots = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { startDate, endDate } = req.query;

    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const whereClause = { doctor_id: doctor.id };
    
    if (startDate && endDate) {
      whereClause.slot_date = {
        [Op.between]: [startDate, endDate],
      };
    } else if (startDate) {
      whereClause.slot_date = {
        [Op.gte]: startDate,
      };
    }

    const slots = await AvailabilitySlot.findAll({
      where: whereClause,
      order: [['slot_date', 'ASC'], ['start_time', 'ASC']],
    });

    res.json({ slots });
  } catch (error) {
    console.error('Error fetching availability slots:', error);
    res.status(500).json({ message: 'Failed to fetch availability slots' });
  }
};

/**
 * Create specific availability slots
 * @route   POST /api/availability/slots
 * @access  Private (Doctor only)
 */
export const createAvailabilitySlots = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { slots } = req.body;

    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ message: 'Invalid slots data' });
    }

    for (const s of slots) {
      if (!s.slot_date || !/^\d{4}-\d{2}-\d{2}$/.test(s.slot_date)) {
        return res.status(400).json({ message: 'Invalid slot_date — expected YYYY-MM-DD' });
      }
      if (!isValidTimeFormat(s.start_time) || !isValidTimeFormat(s.end_time)) {
        return res.status(400).json({ message: 'Invalid time format — expected HH:MM' });
      }
      if (timeToMinutes(s.start_time) >= timeToMinutes(s.end_time)) {
        return res.status(400).json({ message: 'start_time must be before end_time' });
      }
      const dur = s.appointment_duration ?? 30;
      if (!isValidDuration(dur)) {
        return res.status(400).json({
          message: `Invalid appointment_duration "${dur}": must be one of ${ALLOWED_DURATIONS.join(', ')} minutes`,
        });
      }
      if (s.appointment_type !== undefined && !isValidAppointmentType(s.appointment_type)) {
        return res.status(400).json({
          message: `Invalid appointment_type: must be a non-empty array containing only ${ALLOWED_APPOINTMENT_TYPES.join(', ')}`,
        });
      }
    }

    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const createdSlots = await Promise.all(
      slots.map((slot) =>
        AvailabilitySlot.create({
          doctor_id: doctor.id,
          slot_date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          appointment_duration: slot.appointment_duration || 30,
          is_available: slot.is_available !== false,
          appointment_type: slot.appointment_type || ['virtual', 'in-person'],
        })
      )
    );

    res.json({
      message: 'Availability slots created successfully',
      slots: createdSlots,
    });
  } catch (error) {
    console.error('Error creating availability slots:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Slot already exists for this date and time' });
    }
    res.status(500).json({ message: 'Failed to create availability slots' });
  }
};

/**
 * Update a specific availability slot
 * @route   PUT /api/availability/slots/:slotId
 * @access  Private (Doctor only)
 */
export const updateAvailabilitySlot = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { slotId } = req.params;
    const { is_available, appointment_type, start_time, end_time, appointment_duration } = req.body;

    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const slot = await AvailabilitySlot.findOne({
      where: { id: slotId, doctor_id: doctor.id },
    });

    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    // Validate provided fields
    if ((start_time && !isValidTimeFormat(start_time)) || (end_time && !isValidTimeFormat(end_time))) {
      return res.status(400).json({ message: 'Invalid time format — expected HH:MM' });
    }
    const effectiveStart = start_time || slot.start_time;
    const effectiveEnd = end_time || slot.end_time;
    if (timeToMinutes(effectiveStart) >= timeToMinutes(effectiveEnd)) {
      return res.status(400).json({ message: 'start_time must be before end_time' });
    }
    if (appointment_duration !== undefined && !isValidDuration(appointment_duration)) {
      return res.status(400).json({
        message: `Invalid appointment_duration "${appointment_duration}": must be one of ${ALLOWED_DURATIONS.join(', ')} minutes`,
      });
    }
    if (appointment_type !== undefined && !isValidAppointmentType(appointment_type)) {
      return res.status(400).json({
        message: `Invalid appointment_type: must be a non-empty array containing only ${ALLOWED_APPOINTMENT_TYPES.join(', ')}`,
      });
    }

    // Update only provided fields
    if (is_available !== undefined) slot.is_available = is_available;
    if (appointment_type) slot.appointment_type = appointment_type;
    if (start_time) slot.start_time = start_time;
    if (end_time) slot.end_time = end_time;
    if (appointment_duration !== undefined) slot.appointment_duration = appointment_duration;

    await slot.save();
    res.json({ message: 'Slot updated successfully', slot });
  } catch (error) {
    console.error('Error updating slot:', error);
    res.status(500).json({ message: 'Failed to update slot' });
  }
};

/**
 * Delete a specific availability slot
 * @route   DELETE /api/availability/slots/:slotId
 * @access  Private (Doctor only)
 */
export const deleteAvailabilitySlot = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { slotId } = req.params;

    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const slot = await AvailabilitySlot.findOne({
      where: { id: slotId, doctor_id: doctor.id },
    });

    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    await slot.destroy();
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ message: 'Failed to delete slot' });
  }
};

/**
 * Get public availability for a specific doctor (for patients to view)
 * @route   GET /api/availability/doctor/:doctorId
 * @access  Public
 */
export const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Get patterns
    const patterns = await AvailabilityPattern.findAll({
      where: { doctor_id: doctorId, is_active: true },
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
    });

    // Get specific slots if date range provided
    let slots = [];
    if (startDate) {
      const whereClause = {
        doctor_id: doctorId,
        is_available: true,
      };

      if (startDate && endDate) {
        whereClause.slot_date = {
          [Op.between]: [startDate, endDate],
        };
      } else {
        whereClause.slot_date = {
          [Op.gte]: startDate,
        };
      }

      slots = await AvailabilitySlot.findAll({
        where: whereClause,
        order: [['slot_date', 'ASC'], ['start_time', 'ASC']],
      });
    }

    res.json({ patterns, slots });
  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    res.status(500).json({ message: 'Failed to fetch doctor availability' });
  }
};

/**
 * Get computed bookable time slots for a doctor on a specific date (for patients)
 * @route   GET /api/availability/doctor/:userId/slots
 * @access  Public
 * @query   date (required, YYYY-MM-DD)
 * @query   appointmentType (optional, 'virtual' | 'in-person')
 */
export const getBookableSlots = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, appointmentType, includeBooked } = req.query;
    const shouldIncludeBooked = String(includeBooked || '').toLowerCase() === 'true';

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Valid date parameter required (YYYY-MM-DD)' });
    }

    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const requestedDate = new Date(date + 'T00:00:00');
    const dayOfWeek = requestedDate.getDay();

    // 1. Get active patterns for this day of week
    const patterns = await AvailabilityPattern.findAll({
      where: {
        doctor_id: doctor.id,
        day_of_week: dayOfWeek,
        is_active: true,
      },
    });

    // 2. Generate individual slots from patterns
    let generatedSlots = [];
    for (const pattern of patterns) {
      const slots = generateTimeSlotsFromPattern(
        pattern.start_time,
        pattern.end_time,
        pattern.appointment_duration,
        pattern.appointment_type
      );
      generatedSlots.push(...slots);
    }

    // 3. Get specific slot overrides for this date
    const specificSlots = await AvailabilitySlot.findAll({
      where: {
        doctor_id: doctor.id,
        slot_date: date,
      },
    });

    // 4. Apply overrides
    generatedSlots = applySlotOverrides(generatedSlots, specificSlots);

    // 5. Get existing appointments on this date (non-cancelled)
    const appointments = await Appointment.findAll({
      where: {
        doctor_id: doctor.id,
        appointment_date: date,
        status: { [Op.notIn]: ['cancelled'] },
      },
    });

    // 6. Split into available/booked slot groups
    let availableSlots = [];
    let bookedSlots = [];

    for (const slot of generatedSlots) {
      const overlappingAppointment = getOverlappingAppointment(slot, appointments);
      if (!overlappingAppointment) {
        availableSlots.push(slot);
        continue;
      }

      bookedSlots.push({
        ...slot,
        bookedAppointmentType: overlappingAppointment.appointment_type,
      });
    }

    // Exclude slots that are already in the past at request time.
    availableSlots = availableSlots.filter((slot) => isFutureDateTime(date, slot.startTime));
    bookedSlots = bookedSlots.filter((slot) => isFutureDateTime(date, slot.startTime));

    // 7. Optionally filter by appointment type
    if (appointmentType) {
      availableSlots = availableSlots.filter(
        (slot) => slot.appointmentTypes.includes(appointmentType)
      );

      bookedSlots = bookedSlots.filter(
        (slot) => slot.bookedAppointmentType === appointmentType
      );
    }

    // 8. Sort by start time
    availableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    bookedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    res.json({
      date,
      doctor_id: doctor.id,
      slots: availableSlots.map((slot) => ({
        start_time: slot.startTime,
        end_time: slot.endTime,
        appointment_types: slot.appointmentTypes,
      })),
      booked_slots: shouldIncludeBooked
        ? bookedSlots.map((slot) => ({
            start_time: slot.startTime,
            end_time: slot.endTime,
            appointment_types: slot.appointmentTypes,
            booked_appointment_type: slot.bookedAppointmentType,
          }))
        : [],
    });
  } catch (error) {
    console.error('Error fetching bookable slots:', error);
    res.status(500).json({ message: 'Failed to fetch available time slots' });
  }
};

/**
 * Get doctors with availability slots matching criteria
 * @route   GET /api/doctors/with-availability
 * @access  Public
 */
export const getDoctorsWithAvailability = async (req, res) => {
  try {
    const {
      appointmentType,
      specialty,
      date,
      timeOfDay,
      language,
      limit = 50,
      offset = 0
    } = req.query;

    console.log('Fetching doctors with availability filters:', { appointmentType, specialty, date, timeOfDay, language });

    const {
      slotWhereClause,
      patternWhereClause,
      doctorWhereClause,
    } = buildAvailabilityFilterClauses({ date, appointmentType, timeOfDay, language });

    console.log('Slot where clause:', JSON.stringify(slotWhereClause, null, 2));
    console.log('Pattern where clause:', JSON.stringify(patternWhereClause, null, 2));
    console.log('Doctor where clause:', JSON.stringify(doctorWhereClause, null, 2));

    // Query doctors with LEFT JOIN on both slots and patterns
    const doctorsRaw = await Doctor.findAll({
      where: doctorWhereClause,
      include: [
        {
          model: AvailabilitySlot,
          as: 'availabilitySlots',
          where: slotWhereClause,
          required: false,
        },
        {
          model: AvailabilityPattern,
          as: 'availabilityPatterns',
          where: patternWhereClause,
          required: false,
        },
      ],
      order: [
        [{ model: AvailabilitySlot, as: 'availabilitySlots' }, 'slot_date', 'ASC'],
        [{ model: AvailabilitySlot, as: 'availabilitySlots' }, 'start_time', 'ASC'],
      ],
    });

    // Keep only doctors who have at least one matching slot OR pattern
    const filtered = doctorsRaw.filter(d =>
      d.availabilitySlots.length > 0 || d.availabilityPatterns.length > 0
    );

    console.log(`Found ${filtered.length} doctors with availability`);

    // Get ratings for all filtered doctors
    const doctorIds = filtered.map(d => d.id);
    const ratingRows = doctorIds.length > 0
      ? await Review.findAll({
          attributes: [
            'doctor_id',
            [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'review_count'],
          ],
          where: {
            doctor_id: {
              [Op.in]: doctorIds,
            },
          },
          group: ['doctor_id'],
          raw: true,
        })
      : [];

    const ratingByDoctorId = new Map(
      ratingRows.map((row) => [
        Number(row.doctor_id),
        {
          rating: row.average_rating ? Number(Number(row.average_rating).toFixed(1)) : 0,
          review_count: Number(row.review_count || 0),
        },
      ])
    );

    const doctors = filtered.map(doctor => ({
      id: doctor.id,
      user_id: doctor.user_id,
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      phone: doctor.phone,
      bio: doctor.bio,
      languages: doctor.languages || [],
      clinic_location: doctor.clinic_location,
      latitude: doctor.latitude,
      longitude: doctor.longitude,
      virtual_available: doctor.virtual_available,
      in_person_available: doctor.in_person_available,
      verification_status: doctor.verification_status,
      verified_at: doctor.verified_at,
      profile_complete: doctor.profile_complete,
      rating: ratingByDoctorId.get(doctor.id)?.rating || 0,
      review_count: ratingByDoctorId.get(doctor.id)?.review_count || 0,
      created_at: doctor.created_at,
      updated_at: doctor.updated_at,
      availability_slots: doctor.availabilitySlots.map(s => ({
        id: s.id,
        slot_date: s.slot_date,
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: s.is_available,
        appointment_type: s.appointment_type,
      })),
      availability_patterns: doctor.availabilityPatterns.map(p => ({
        id: p.id,
        day_of_week: p.day_of_week,
        start_time: p.start_time,
        end_time: p.end_time,
        appointment_type: p.appointment_type,
        is_active: p.is_active,
      })),
    }));

    res.status(200).json({
      success: true,
      count: doctors.length,
      doctors: doctors,
    });
  } catch (error) {
    console.error("Error fetching doctors with availability:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctors with availability",
      error: error.message,
    });
  }
};

/**
 * Get available time slots for a specific doctor on a specific date
 * @route   GET /api/availability/doctor/:doctorId/slots
 * @access  Public
 */
export const getDoctorAvailableSlotsByDate = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: "Date is required" 
      });
    }

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: "Doctor not found" 
      });
    }

    // Get slots for the specific date
    const slots = await AvailabilitySlot.findAll({
      where: { 
        doctor_id: doctorId,
        slot_date: date,
        is_available: true
      },
      order: [['start_time', 'ASC']],
    });

    res.status(200).json({
      success: true,
      date: date,
      slots: slots,
    });
  } catch (error) {
    console.error("Error fetching doctor slots by date:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor slots",
      error: error.message,
    });
  }
};
