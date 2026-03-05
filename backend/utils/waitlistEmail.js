const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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

const formatAppointmentType = (value) =>
  String(value || '').trim() === 'in-person' ? 'In-Person' : 'Virtual';

const sendEmail = async ({ to, subject, text, html, label }) => {
  if (!to) return;

  if (EMAIL_PROVIDER === 'console') {
    console.log(`[${label}]`);
    console.log(`To: ${to}`);
    console.log(text);
    return;
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};

export const sendWaitlistAutoBookedEmail = async ({
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentStartTime,
  appointmentEndTime,
  appointmentType,
}) => {
  if (!to) return;

  const safePatientName = escapeHtml(patientName || 'Patient');
  const safeDoctorName = escapeHtml(doctorName || 'your provider');
  const dateLabel = toPrettyDate(appointmentDate) || String(appointmentDate || '');
  const startLabel = toPrettyTime(appointmentStartTime) || String(appointmentStartTime || '');
  const endLabel = toPrettyTime(appointmentEndTime) || String(appointmentEndTime || '');
  const typeLabel = formatAppointmentType(appointmentType);
  const appointmentsLink = `${FRONTEND_URL.replace(/\/$/, '')}/patient/appointments`;

  const subject = 'You were automatically booked from the waitlist';
  const text = `Hi ${patientName || 'Patient'}, a cancelled slot with ${doctorName || 'your provider'} was reassigned to you from the waitlist on ${dateLabel}, ${startLabel}-${endLabel} (${typeLabel}). Review your appointment: ${appointmentsLink}`;
  const html = `
  <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;background:#059669;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">Waitlist Update</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Hi ${safePatientName},
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Great news. A cancelled slot with <strong>${safeDoctorName}</strong> has been automatically reassigned to you from the waitlist.
                </p>
                <div style="margin:0 0 20px;padding:14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Date:</strong> ${escapeHtml(dateLabel)}</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Time:</strong> ${escapeHtml(startLabel)} - ${escapeHtml(endLabel)}</p>
                  <p style="margin:0;font-size:14px;color:#111827;"><strong>Type:</strong> ${escapeHtml(typeLabel)}</p>
                </div>
                <p style="margin:0 0 24px;">
                  <a
                    href="${escapeHtml(appointmentsLink)}"
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

  await sendEmail({
    to,
    subject,
    text,
    html,
    label: 'Waitlist Auto-Booked Email',
  });
};

export const sendWaitlistSlotOpenedEmail = async ({
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentStartTime,
  appointmentEndTime,
  appointmentType,
}) => {
  if (!to) return;

  const safePatientName = escapeHtml(patientName || 'Patient');
  const safeDoctorName = escapeHtml(doctorName || 'your provider');
  const dateLabel = toPrettyDate(appointmentDate) || String(appointmentDate || '');
  const startLabel = toPrettyTime(appointmentStartTime) || String(appointmentStartTime || '');
  const endLabel = toPrettyTime(appointmentEndTime) || String(appointmentEndTime || '');
  const typeLabel = formatAppointmentType(appointmentType);
  const bookingLink = `${FRONTEND_URL.replace(/\/$/, '')}/patient/providers`;

  const subject = 'A waitlisted appointment slot is now available';
  const text = `Hi ${patientName || 'Patient'}, a slot you waitlisted for with ${doctorName || 'your provider'} opened up on ${dateLabel}, ${startLabel}-${endLabel} (${typeLabel}). Book now: ${bookingLink}`;
  const html = `
  <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;background:#1d4ed8;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;">Waitlist Slot Opened</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Hi ${safePatientName},
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  A previously unavailable slot with <strong>${safeDoctorName}</strong> is now open.
                </p>
                <div style="margin:0 0 20px;padding:14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Date:</strong> ${escapeHtml(dateLabel)}</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>Time:</strong> ${escapeHtml(startLabel)} - ${escapeHtml(endLabel)}</p>
                  <p style="margin:0;font-size:14px;color:#111827;"><strong>Type:</strong> ${escapeHtml(typeLabel)}</p>
                </div>
                <p style="margin:0 0 24px;">
                  <a
                    href="${escapeHtml(bookingLink)}"
                    style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px;"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Book Appointment
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

  await sendEmail({
    to,
    subject,
    text,
    html,
    label: 'Waitlist Slot Opened Email',
  });
};
