import { sequelize, Appointment, Doctor, Patient, Review, User } from '../models/index.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const toOptionalTrimmedText = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

const serializeReview = (review) => ({
  id: review.id,
  patient_id: review.patient_id,
  doctor_id: review.doctor_id,
  rating: review.rating,
  comment: review.comment,
  is_anonymous: review.is_anonymous,
  patient_name: review.patient?.full_name || review.patient?.user?.username || null,
  created_at: review.created_at,
  updated_at: review.updated_at,
});

const reviewInclude = [
  {
    model: Patient,
    as: 'patient',
    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
  },
];

const getPatientProfile = async (userId, transaction) => {
  const patient = await Patient.findOne({
    where: { user_id: userId },
    transaction,
  });

  if (!patient) {
    throw new HttpError(404, 'Patient profile not found.');
  }

  return patient;
};

const getPatientAppointmentForReview = async ({ appointmentId, patientId, transaction }) => {
  const appointment = await Appointment.findOne({
    where: {
      id: appointmentId,
      patient_id: patientId,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!appointment) {
    throw new HttpError(404, 'Appointment not found.');
  }

  if (appointment.status !== 'completed') {
    throw new HttpError(409, 'Reviews can only be submitted for completed appointments.');
  }

  return appointment;
};

export const upsertReview = async (req, res) => {
  try {
    const appointmentId = Number(req.body?.appointment_id);
    const rating = Number(req.body?.rating);
    const comment = toOptionalTrimmedText(req.body?.comment);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'Valid appointment_id is required.' });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'rating must be an integer between 1 and 5.' });
    }

    if (comment && comment.length > 2000) {
      return res.status(400).json({ message: 'comment is too long (max 2000 characters).' });
    }

    const result = await sequelize.transaction(async (transaction) => {
      const patient = await getPatientProfile(req.auth.userId, transaction);
      const appointment = await getPatientAppointmentForReview({
        appointmentId,
        patientId: patient.id,
        transaction,
      });

      const existing = await Review.findOne({
        where: {
          patient_id: patient.id,
          doctor_id: appointment.doctor_id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existing) {
        existing.rating = rating;
        existing.comment = comment;
        await existing.save({ transaction });

        const hydrated = await Review.findByPk(existing.id, {
          include: reviewInclude,
          transaction,
        });

        return {
          created: false,
          review: hydrated,
        };
      }

      const created = await Review.create(
        {
          patient_id: patient.id,
          doctor_id: appointment.doctor_id,
          rating,
          comment,
          is_anonymous: false,
        },
        { transaction }
      );

      const hydrated = await Review.findByPk(created.id, {
        include: reviewInclude,
        transaction,
      });

      return {
        created: true,
        review: hydrated,
      };
    });

    return res.status(result.created ? 201 : 200).json({
      message: result.created ? 'Review submitted successfully.' : 'Review updated successfully.',
      review: serializeReview(result.review),
    });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : 'Failed to submit review.';

    if (!(error instanceof HttpError)) {
      console.error('Error upserting review:', error);
    }

    return res.status(statusCode).json({ message });
  }
};

export const getMyReviewForDoctor = async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ message: 'Invalid doctor ID.' });
    }

    const patient = await Patient.findOne({ where: { user_id: req.auth.userId } });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found.' });
    }

    const review = await Review.findOne({
      where: {
        patient_id: patient.id,
        doctor_id: doctorId,
      },
      include: reviewInclude,
    });

    return res.json({
      doctor_id: doctorId,
      review: review ? serializeReview(review) : null,
    });
  } catch (error) {
    console.error('Error fetching my review for doctor:', error);
    return res.status(500).json({ message: 'Failed to fetch review.' });
  }
};

export const getDoctorReviews = async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ message: 'Invalid doctor ID.' });
    }

    const doctor = await Doctor.findByPk(doctorId, {
      attributes: ['id', 'full_name', 'verification_status'],
    });

    if (!doctor || doctor.verification_status !== 'approved') {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const reviews = await Review.findAll({
      where: { doctor_id: doctorId },
      include: reviewInclude,
      order: [['updated_at', 'DESC']],
    });

    const reviewCount = reviews.length;
    const totalRating = reviews.reduce((acc, review) => acc + Number(review.rating || 0), 0);
    const averageRating = reviewCount > 0
      ? Number((totalRating / reviewCount).toFixed(1))
      : 0;

    return res.json({
      doctor_id: doctor.id,
      doctor_name: doctor.full_name,
      average_rating: averageRating,
      review_count: reviewCount,
      reviews: reviews.map(serializeReview),
    });
  } catch (error) {
    console.error('Error fetching doctor reviews:', error);
    return res.status(500).json({ message: 'Failed to fetch doctor reviews.' });
  }
};
