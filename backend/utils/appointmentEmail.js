const cleanEnv = (value, fallback = '') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

const EMAIL_PROVIDER = cleanEnv(process.env.EMAIL_PROVIDER, 'console');
const FRONTEND_URL = cleanEnv(process.env.FRONTEND_URL, 'http://localhost:5173');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toPrettyDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const toPrettyTime = (timeValue) => {
  if (typeof timeValue !== 'string') return '';
  const [hours = '0', minutes = '0'] = timeValue.split(':');
  const hour = Number.parseInt(hours, 10);
  const minute = Number.parseInt(minutes, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeValue;

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const adjusted = hour % 12 === 0 ? 12 : hour % 12;
  return `${adjusted}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const buildCancellationEmailHtml = ({
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  appointmentType,
  rebookLink,
}) => {
  const safePatientName = escapeHtml(patientName || 'Patient');
  const safeDoctorName = escapeHtml(doctorName || 'your provider');
  const safeDate = escapeHtml(appointmentDate);
  const safeTime = escapeHtml(appointmentTime);
  const safeType = escapeHtml(appointmentType);
  const safeRebookLink = escapeHtml(rebookLink);

  return `
  <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;background:#b91c1c;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">Appointment Cancelled</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Hi ${safePatientName},
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Your appointment with <strong>${safeDoctorName}</strong> has been cancelled.
                </p>
                <div style="margin:0 0 20px;padding:14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Date:</strong> ${safeDate}</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Time:</strong> ${safeTime}</p>
                  <p style="margin:0;font-size:14px;color:#111827;"><strong>Type:</strong> ${safeType}</p>
                </div>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
                  Please book a new appointment at your convenience.
                </p>
                <p style="margin:0 0 24px;">
                  <a
                    href="${safeRebookLink}"
                    style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px;"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Book New Appointment
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
};

const buildCancellationEmailText = ({
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  appointmentType,
  rebookLink,
}) =>
  `Hi ${patientName || 'Patient'}, your appointment with ${doctorName || 'your provider'} on ${appointmentDate} at ${appointmentTime} (${appointmentType}) has been cancelled. Please book a new appointment here: ${rebookLink}`;

const buildApprovalEmailHtml = ({
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  appointmentType,
  appointmentsLink,
}) => {
  const safePatientName = escapeHtml(patientName || 'Patient');
  const safeDoctorName = escapeHtml(doctorName || 'your provider');
  const safeDate = escapeHtml(appointmentDate);
  const safeTime = escapeHtml(appointmentTime);
  const safeType = escapeHtml(appointmentType);
  const safeAppointmentsLink = escapeHtml(appointmentsLink);

  return `
  <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;background:#15803d;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">Appointment Confirmed</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Hi ${safePatientName},
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Your appointment with <strong>${safeDoctorName}</strong> has been confirmed.
                </p>
                <div style="margin:0 0 20px;padding:14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Date:</strong> ${safeDate}</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Time:</strong> ${safeTime}</p>
                  <p style="margin:0;font-size:14px;color:#111827;"><strong>Type:</strong> ${safeType}</p>
                </div>
                <p style="margin:0 0 24px;">
                  <a
                    href="${safeAppointmentsLink}"
                    style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px;"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Appointment
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
};

const buildApprovalEmailText = ({
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  appointmentType,
  appointmentsLink,
}) =>
  `Hi ${patientName || 'Patient'}, your appointment with ${doctorName || 'your provider'} on ${appointmentDate} at ${appointmentTime} (${appointmentType}) has been confirmed. View details: ${appointmentsLink}`;

const buildDoctorNoticeEmailHtml = ({
  title,
  intro,
  doctorName,
  patientName,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => `
  <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;background:#1d4ed8;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Hi ${escapeHtml(doctorName || 'Doctor')},
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  ${escapeHtml(intro)}
                </p>
                <div style="margin:0;padding:14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Patient:</strong> ${escapeHtml(patientName || 'Patient')}</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Date:</strong> ${escapeHtml(appointmentDate)}</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Time:</strong> ${escapeHtml(appointmentTime)}</p>
                  <p style="margin:0;font-size:14px;color:#111827;"><strong>Type:</strong> ${escapeHtml(appointmentType)}</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

export const sendDoctorCancellationEmail = async ({
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => {
  if (!to) return;

  const prettyDate = toPrettyDate(appointmentDate);
  const prettyTime = toPrettyTime(appointmentTime);
  const normalizedType = appointmentType === 'in-person' ? 'In-Person' : 'Virtual';
  const rebookLink = `${FRONTEND_URL.replace(/\/$/, '')}/patient/providers`;

  const payload = {
    patientName,
    doctorName,
    appointmentDate: prettyDate || String(appointmentDate || ''),
    appointmentTime: prettyTime || String(appointmentTime || ''),
    appointmentType: normalizedType,
    rebookLink,
  };

  if (EMAIL_PROVIDER === 'console') {
    console.log('[Appointment Cancellation Email]');
    console.log(`To: ${to}`);
    console.log(buildCancellationEmailText(payload));
    return;
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: cleanEnv(process.env.SMTP_HOST),
    port: Number(cleanEnv(process.env.SMTP_PORT, '587')),
    secure: cleanEnv(process.env.SMTP_SECURE, 'false') === 'true',
    auth: {
      user: cleanEnv(process.env.SMTP_USER),
      pass: cleanEnv(process.env.SMTP_PASS),
    },
  });

  await transporter.sendMail({
    from: cleanEnv(process.env.EMAIL_FROM) || cleanEnv(process.env.SMTP_USER),
    to,
    subject: 'Your appointment has been cancelled',
    text: buildCancellationEmailText(payload),
    html: buildCancellationEmailHtml(payload),
  });
};

export const sendDoctorApprovalEmail = async ({
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => {
  if (!to) return;

  const prettyDate = toPrettyDate(appointmentDate);
  const prettyTime = toPrettyTime(appointmentTime);
  const normalizedType = appointmentType === 'in-person' ? 'In-Person' : 'Virtual';
  const appointmentsLink = `${FRONTEND_URL.replace(/\/$/, '')}/patient/dashboard`;

  const payload = {
    patientName,
    doctorName,
    appointmentDate: prettyDate || String(appointmentDate || ''),
    appointmentTime: prettyTime || String(appointmentTime || ''),
    appointmentType: normalizedType,
    appointmentsLink,
  };

  if (EMAIL_PROVIDER === 'console') {
    console.log('[Appointment Approval Email]');
    console.log(`To: ${to}`);
    console.log(buildApprovalEmailText(payload));
    return;
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: cleanEnv(process.env.SMTP_HOST),
    port: Number(cleanEnv(process.env.SMTP_PORT, '587')),
    secure: cleanEnv(process.env.SMTP_SECURE, 'false') === 'true',
    auth: {
      user: cleanEnv(process.env.SMTP_USER),
      pass: cleanEnv(process.env.SMTP_PASS),
    },
  });

  await transporter.sendMail({
    from: cleanEnv(process.env.EMAIL_FROM) || cleanEnv(process.env.SMTP_USER),
    to,
    subject: 'Your appointment has been confirmed',
    text: buildApprovalEmailText(payload),
    html: buildApprovalEmailHtml(payload),
  });
};

export const sendPatientCancellationEmailToDoctor = async ({
  to,
  doctorName,
  patientName,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => {
  if (!to) return;

  const prettyDate = toPrettyDate(appointmentDate) || String(appointmentDate || '');
  const prettyTime = toPrettyTime(appointmentTime) || String(appointmentTime || '');
  const normalizedType = appointmentType === 'in-person' ? 'In-Person' : 'Virtual';
  const intro = `${patientName || 'A patient'} cancelled their appointment.`;
  const subject = 'Patient cancelled an appointment';
  const text = `Hi ${doctorName || 'Doctor'}, ${patientName || 'a patient'} cancelled their ${normalizedType} appointment on ${prettyDate} at ${prettyTime}.`;

  if (EMAIL_PROVIDER === 'console') {
    console.log('[Patient Cancellation Email To Doctor]');
    console.log(`To: ${to}`);
    console.log(text);
    return;
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: cleanEnv(process.env.SMTP_HOST),
    port: Number(cleanEnv(process.env.SMTP_PORT, '587')),
    secure: cleanEnv(process.env.SMTP_SECURE, 'false') === 'true',
    auth: {
      user: cleanEnv(process.env.SMTP_USER),
      pass: cleanEnv(process.env.SMTP_PASS),
    },
  });

  await transporter.sendMail({
    from: cleanEnv(process.env.EMAIL_FROM) || cleanEnv(process.env.SMTP_USER),
    to,
    subject,
    text,
    html: buildDoctorNoticeEmailHtml({
      title: 'Appointment Cancelled by Patient',
      intro,
      doctorName,
      patientName,
      appointmentDate: prettyDate,
      appointmentTime: prettyTime,
      appointmentType: normalizedType,
    }),
  });
};

export const sendPatientRescheduleEmailToDoctor = async ({
  to,
  doctorName,
  patientName,
  appointmentDate,
  appointmentTime,
  appointmentType,
}) => {
  if (!to) return;

  const prettyDate = toPrettyDate(appointmentDate) || String(appointmentDate || '');
  const prettyTime = toPrettyTime(appointmentTime) || String(appointmentTime || '');
  const normalizedType = appointmentType === 'in-person' ? 'In-Person' : 'Virtual';
  const intro = `${patientName || 'A patient'} rescheduled an appointment. Please review and reconfirm.`;
  const subject = 'Patient rescheduled an appointment';
  const text = `Hi ${doctorName || 'Doctor'}, ${patientName || 'a patient'} rescheduled to ${prettyDate} at ${prettyTime} (${normalizedType}). Please review and reconfirm.`;

  if (EMAIL_PROVIDER === 'console') {
    console.log('[Patient Reschedule Email To Doctor]');
    console.log(`To: ${to}`);
    console.log(text);
    return;
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: cleanEnv(process.env.SMTP_HOST),
    port: Number(cleanEnv(process.env.SMTP_PORT, '587')),
    secure: cleanEnv(process.env.SMTP_SECURE, 'false') === 'true',
    auth: {
      user: cleanEnv(process.env.SMTP_USER),
      pass: cleanEnv(process.env.SMTP_PASS),
    },
  });

  await transporter.sendMail({
    from: cleanEnv(process.env.EMAIL_FROM) || cleanEnv(process.env.SMTP_USER),
    to,
    subject,
    text,
    html: buildDoctorNoticeEmailHtml({
      title: 'Appointment Rescheduled by Patient',
      intro,
      doctorName,
      patientName,
      appointmentDate: prettyDate,
      appointmentTime: prettyTime,
      appointmentType: normalizedType,
    }),
  });
};
