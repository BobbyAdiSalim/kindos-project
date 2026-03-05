import { Op } from 'sequelize';
import { User, Patient, Doctor, Connection, Message } from '../models/index.js';

/**
 * Send a connect request from a patient to a doctor.
 * POST /api/chat/connect
 * Body: { doctorId }
 */
export const sendConnectRequest = async (req, res) => {
  try {
    const { userId, role } = req.auth;

    if (role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can send connect requests.' });
    }

    const { doctorId } = req.body;
    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId is required.' });
    }

    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    if (doctor.verification_status !== 'approved') {
      return res.status(400).json({ error: 'Doctor is not verified.' });
    }

    const existing = await Connection.findOne({
      where: { patient_id: patient.id, doctor_id: doctor.id },
    });

    if (existing) {
      return res.status(409).json({
        error: `Connection already exists with status: ${existing.status}.`,
        connection: existing,
      });
    }

    const connection = await Connection.create({
      patient_id: patient.id,
      doctor_id: doctor.id,
      status: 'pending',
    });

    return res.status(201).json({ message: 'Connect request sent.', connection });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get all connections for the current user (patient or doctor).
 * GET /api/chat/connections
 */
export const getMyConnections = async (req, res) => {
  try {
    const { userId, role } = req.auth;

    let where;
    let include;

    if (role === 'patient') {
      const patient = await Patient.findOne({ where: { user_id: userId } });
      if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

      where = { patient_id: patient.id };
      include = [
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['id', 'full_name', 'specialty', 'user_id'],
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
        },
      ];
    } else if (role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { user_id: userId } });
      if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

      where = { doctor_id: doctor.id };
      include = [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name', 'user_id'],
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
        },
      ];
    } else {
      return res.status(403).json({ error: 'Admins do not have chat connections.' });
    }

    const connections = await Connection.findAll({
      where,
      include,
      order: [['updated_at', 'DESC']],
    });

    // Attach last message and unread count per connection
    const connectionsWithMeta = await Promise.all(
      connections.map(async (conn) => {
        const connJson = conn.toJSON();

        const otherUserId =
          role === 'patient' ? conn.doctor?.user_id : conn.patient?.user_id;

        if (conn.status === 'accepted' && otherUserId) {
          const lastMessage = await Message.findOne({
            where: {
              [Op.or]: [
                { sender_id: userId, receiver_id: otherUserId },
                { sender_id: otherUserId, receiver_id: userId },
              ],
            },
            order: [['created_at', 'DESC']],
          });

          const unreadCount = await Message.count({
            where: {
              sender_id: otherUserId,
              receiver_id: userId,
              read: false,
            },
          });

          connJson.lastMessage = lastMessage;
          connJson.unreadCount = unreadCount;
        }

        return connJson;
      })
    );

    return res.status(200).json({ connections: connectionsWithMeta });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending connect requests for a doctor.
 * GET /api/chat/requests/pending
 */
export const getPendingRequests = async (req, res) => {
  try {
    const { userId, role } = req.auth;

    if (role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can view pending requests.' });
    }

    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const pending = await Connection.findAll({
      where: { doctor_id: doctor.id, status: 'pending' },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name', 'user_id'],
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    return res.status(200).json({ requests: pending });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Accept or reject a connection request (doctor only).
 * PATCH /api/chat/connections/:connectionId
 * Body: { status: 'accepted' | 'rejected' }
 */
export const respondToConnection = async (req, res) => {
  try {
    const { userId, role } = req.auth;

    if (role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can respond to connection requests.' });
    }

    const { connectionId } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "accepted" or "rejected".' });
    }

    const doctor = await Doctor.findOne({ where: { user_id: userId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const connection = await Connection.findOne({
      where: { id: connectionId, doctor_id: doctor.id },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found.' });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({ error: `Connection has already been ${connection.status}.` });
    }

    connection.status = status;
    await connection.save();

    return res.status(200).json({ message: `Connection ${status}.`, connection });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get messages for a conversation (by connection ID).
 * GET /api/chat/messages/:connectionId
 * Query: ?limit=50&before=<messageId>
 */
export const getConversation = async (req, res) => {
  try {
    const { userId, role } = req.auth;
    const { connectionId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before ? parseInt(req.query.before) : null;

    const connection = await Connection.findByPk(connectionId, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'user_id'] },
        { model: Doctor, as: 'doctor', attributes: ['id', 'full_name', 'user_id'] },
      ],
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found.' });
    }

    // Verify the user is part of this connection
    const isPatient = connection.patient?.user_id === userId;
    const isDoctor = connection.doctor?.user_id === userId;
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ error: 'You are not part of this connection.' });
    }

    if (connection.status !== 'accepted') {
      return res.status(400).json({ error: 'Connection must be accepted to view messages.' });
    }

    const patientUserId = connection.patient.user_id;
    const doctorUserId = connection.doctor.user_id;

    const whereClause = {
      [Op.or]: [
        { sender_id: patientUserId, receiver_id: doctorUserId },
        { sender_id: doctorUserId, receiver_id: patientUserId },
      ],
    };

    if (before) {
      whereClause.id = { [Op.lt]: before };
    }

    const messages = await Message.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'role'] },
      ],
    });

    return res.status(200).json({
      messages: messages.reverse(),
      connection: {
        id: connection.id,
        patient: connection.patient,
        doctor: connection.doctor,
        status: connection.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Send a message within a connection.
 * POST /api/chat/messages/:connectionId
 * Body: { content }
 */
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { connectionId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const connection = await Connection.findByPk(connectionId, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'user_id'] },
        { model: Doctor, as: 'doctor', attributes: ['id', 'user_id'] },
      ],
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found.' });
    }

    const isPatient = connection.patient?.user_id === userId;
    const isDoctor = connection.doctor?.user_id === userId;
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ error: 'You are not part of this connection.' });
    }

    if (connection.status !== 'accepted') {
      return res.status(400).json({ error: 'Connection must be accepted to send messages.' });
    }

    const receiverId = isPatient ? connection.doctor.user_id : connection.patient.user_id;

    const message = await Message.create({
      sender_id: userId,
      receiver_id: receiverId,
      content: content.trim(),
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'role'] },
      ],
    });

    return res.status(201).json({ message: fullMessage });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Mark messages as read in a conversation.
 * PATCH /api/chat/messages/:connectionId/read
 */
export const markMessagesRead = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { connectionId } = req.params;

    const connection = await Connection.findByPk(connectionId, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'user_id'] },
        { model: Doctor, as: 'doctor', attributes: ['id', 'user_id'] },
      ],
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found.' });
    }

    const isPatient = connection.patient?.user_id === userId;
    const isDoctor = connection.doctor?.user_id === userId;
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ error: 'You are not part of this connection.' });
    }

    const otherUserId = isPatient ? connection.doctor.user_id : connection.patient.user_id;

    const [updatedCount] = await Message.update(
      { read: true, read_at: new Date() },
      {
        where: {
          sender_id: otherUserId,
          receiver_id: userId,
          read: false,
        },
      }
    );

    return res.status(200).json({ message: `${updatedCount} messages marked as read.` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
