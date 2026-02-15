/**
 * Availability Controller
 * Handles doctor availability management - both recurring patterns and specific slots
 */

import { AvailabilityPattern, AvailabilitySlot } from '../models/Availability.js';
import Doctor from '../models/Doctor.js';
import { Op } from 'sequelize';

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

    // Find the doctor record
    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    // Delete existing patterns for this doctor
    await AvailabilityPattern.destroy({ where: { doctor_id: doctor.id } });

    // Create new patterns
    const createdPatterns = await Promise.all(
      patterns.map((pattern) =>
        AvailabilityPattern.create({
          doctor_id: doctor.id,
          day_of_week: pattern.day_of_week,
          start_time: pattern.start_time,
          end_time: pattern.end_time,
          appointment_duration: pattern.appointment_duration || 30,
          appointment_type: pattern.appointment_type || ['virtual', 'in-person'],
          is_active: pattern.is_active !== false,
        })
      )
    );

    res.json({
      message: 'Availability patterns updated successfully',
      patterns: createdPatterns,
    });
  } catch (error) {
    console.error('Error setting availability patterns:', error);
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
    const { is_available, appointment_type, start_time, end_time } = req.body;

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

    // Update only provided fields
    if (is_available !== undefined) slot.is_available = is_available;
    if (appointment_type) slot.appointment_type = appointment_type;
    if (start_time) slot.start_time = start_time;
    if (end_time) slot.end_time = end_time;

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

    // Build the availability slot query
    const slotWhereClause = {
      is_available: true,
    };

    // Filter by date if provided
    if (date) {
      slotWhereClause.slot_date = date;
      console.log('Filtering by date:', date);
    }

    // Filter by appointment type
    if (appointmentType && appointmentType !== 'no-preference' && appointmentType !== 'any') {
      slotWhereClause.appointment_type = {
        [Op.contains]: [appointmentType]
      };
      console.log('Filtering by appointment type:', appointmentType);
    }

    // Filter by time of day
    if (timeOfDay && timeOfDay !== 'any') {
      const timeRanges = {
        morning: { start: '08:00:00', end: '12:00:00' },
        afternoon: { start: '12:00:00', end: '17:00:00' },
        evening: { start: '17:00:00', end: '21:00:00' }
      };
      
      const range = timeRanges[timeOfDay];
      if (range) {
        // Check for overlap between slot and time range
        slotWhereClause.start_time = {
          [Op.lt]: range.end
        };
        slotWhereClause.end_time = {
          [Op.gt]: range.start
        };
        console.log('Filtering by time range:', range);
      }
    }

    // Build doctor where clause - ONLY filter by verification status, IGNORE specialty for now
    const doctorWhereClause = {
      verification_status: "approved",
    };

    // IGNORING SPECIALTY FILTER FOR NOW
    // if (specialty && specialty !== "all" && specialty !== 'any') {
    //   doctorWhereClause.specialty = { [Op.iLike]: `%${specialty}%` };
    // }

    // Filter by language if needed
    if (language && language !== "all" && language !== 'any') {
      doctorWhereClause.languages = { [Op.contains]: [language] };
      console.log('Filtering by language:', language);
    }

    console.log('Slot where clause:', JSON.stringify(slotWhereClause, null, 2));
    console.log('Doctor where clause:', JSON.stringify(doctorWhereClause, null, 2));

    // First, find all matching availability slots
    const slots = await AvailabilitySlot.findAll({
      where: slotWhereClause,
      include: [{
        model: Doctor,
        as: 'doctor',
        where: doctorWhereClause,
        required: true,
      }],
      order: [['slot_date', 'ASC'], ['start_time', 'ASC']],
    });

    console.log(`Found ${slots.length} matching slots`);

    // Group slots by doctor
    const doctorMap = new Map();
    
    slots.forEach(slot => {
      const doctor = slot.doctor;
      if (!doctor) return;
      
      if (!doctorMap.has(doctor.id)) {
        // Transform doctor data
        doctorMap.set(doctor.id, {
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
          created_at: doctor.created_at,
          updated_at: doctor.updated_at,
          availability_slots: []
        });
      }
      
      // Add slot to doctor's slots
      doctorMap.get(doctor.id).availability_slots.push({
        id: slot.id,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
        appointment_type: slot.appointment_type,
      });
    });

    const doctors = Array.from(doctorMap.values());
    
    console.log(`Returning ${doctors.length} doctors with availability`);

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
