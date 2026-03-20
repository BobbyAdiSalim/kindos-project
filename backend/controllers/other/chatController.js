import crypto from 'crypto';
import { Readable } from 'stream';
import { Op } from 'sequelize';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { User, Patient, Doctor, Connection, Message } from '../../models/index.js';
import { getRoleStrategy } from '../../services/role-strategy/index.js';

const cleanEnv = (value, fallback = '') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

const R2_BUCKET_NAME = cleanEnv(process.env.R2_BUCKET_NAME);
const R2_ENDPOINT = cleanEnv(process.env.R2_ENDPOINT);
const R2_REGION = cleanEnv(process.env.R2_REGION, 'auto');
const R2_ACCESS_KEY_ID = cleanEnv(process.env.R2_ACCESS_KEY_ID);
const R2_SECRET_ACCESS_KEY = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);

const isR2Configured = Boolean(
  R2_BUCKET_NAME && R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
);

let r2Client = null;

const getR2Client = () => {
  if (!isR2Configured) {
    throw new Error('R2 storage is not configured.');
  }
  if (!r2Client) {
    r2Client = new S3Client({
      region: R2_REGION,
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return r2Client;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

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
    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get all connections for the current user (patient or doctor).
 * GET /api/chat/connections
 */
export const getMyConnections = async (req, res) => {
  try {
    const { userId } = req.auth;
    const roleStrategy = getRoleStrategy(req.auth.role);
    const { where, include } = await roleStrategy.getConnectionScope(userId);

    const connections = await Connection.findAll({
      where,
      include,
      order: [['updated_at', 'DESC']],
    });

    // Attach last message and unread count per connection
    const connectionsWithMeta = await Promise.all(
      connections.map(async (conn) => {
        const connJson = conn.toJSON();
        const otherUserId = roleStrategy.getOtherConnectionUserId(connJson);

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
    if (error?.status) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
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
    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
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
    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
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
    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Send a message within a connection.
 * POST /api/chat/messages/:connectionId
 * Body: { content } or { content?, file: { data, name, type } }
 */
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { connectionId } = req.params;
    const { content, file } = req.body;

    const hasContent = content && content.trim();
    const hasFile = file && file.data && file.name && file.type;

    if (!hasContent && !hasFile) {
      return res.status(400).json({ error: 'Message content or file is required.' });
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

    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    let fileType = null;

    if (hasFile) {
      if (!isDoctor) {
        return res.status(403).json({ error: 'Only doctors can send documents.' });
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return res.status(400).json({
          error: 'File type not allowed. Accepted: PDF, PNG, JPEG, WebP, DOC, DOCX.',
        });
      }

      // Strip data URL prefix if present
      const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > MAX_FILE_BYTES) {
        return res.status(400).json({ error: 'File size exceeds the 10 MB limit.' });
      }

      if (!isR2Configured) {
        return res.status(503).json({ error: 'File storage is not configured.' });
      }

      const uniqueName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const objectKey = `chat-documents/connection-${connectionId}/${uniqueName}`;

      await getR2Client().send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: objectKey,
          Body: buffer,
          ContentType: file.type,
        })
      );

      fileUrl = `r2:${objectKey}`;
      fileName = file.name;
      fileSize = buffer.length;
      fileType = file.type;
    }

    const message = await Message.create({
      sender_id: userId,
      receiver_id: receiverId,
      content: hasContent ? content.trim() : null,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'role'] },
      ],
    });

    return res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Download a chat document.
 * GET /api/chat/messages/:connectionId/document/:messageId
 */
export const downloadChatDocument = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { connectionId, messageId } = req.params;

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

    const message = await Message.findByPk(messageId);
    if (!message || !message.file_url) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Verify the message belongs to this connection's participants
    const patientUserId = connection.patient.user_id;
    const doctorUserId = connection.doctor.user_id;
    const validParticipant =
      (message.sender_id === patientUserId && message.receiver_id === doctorUserId) ||
      (message.sender_id === doctorUserId && message.receiver_id === patientUserId);

    if (!validParticipant) {
      return res.status(403).json({ error: 'Document does not belong to this conversation.' });
    }

    if (!isR2Configured) {
      return res.status(503).json({ error: 'File storage is not configured.' });
    }

    const objectKey = message.file_url.replace(/^r2:/, '');
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
      })
    );

    res.setHeader('Content-Type', message.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${message.file_name || 'document'}"`);

    if (response.Body instanceof Readable) {
      response.Body.pipe(res);
    } else if (response.Body?.transformToByteArray) {
      const bytes = await response.Body.transformToByteArray();
      res.end(Buffer.from(bytes));
    } else {
      res.status(500).json({ error: 'Unable to stream document.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
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
    console.error(error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
