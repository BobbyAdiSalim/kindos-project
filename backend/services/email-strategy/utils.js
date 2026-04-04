const cleanEnv = (value, fallback = '') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

export const FRONTEND_URL = cleanEnv(process.env.FRONTEND_URL, 'http://localhost:5173').replace(/\/$/, '');

export const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const toPrettyDate = (dateValue) => {
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

export const toPrettyTime = (timeValue) => {
  if (typeof timeValue !== 'string') return '';
  const [hours = '0', minutes = '0'] = timeValue.split(':');
  const hour = Number.parseInt(hours, 10);
  const minute = Number.parseInt(minutes, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return String(timeValue);

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const adjusted = hour % 12 === 0 ? 12 : hour % 12;
  return `${adjusted}:${String(minute).padStart(2, '0')} ${suffix}`;
};

export const formatAppointmentType = (value) =>
  String(value || '').trim() === 'in_person' ? 'In-Person' : 'Virtual';

export const cardHtml = ({ title, intro, fields = [], cta = null, footer = '' }) => {
  const fieldRows = fields
    .map(({ label, value }) => `
      <p style="margin:0 0 6px;font-size:14px;color:#111827;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>
    `)
    .join('');

  const ctaHtml = cta
    ? `
      <p style="margin:0 0 24px;">
        <a
          href="${escapeHtml(cta.href)}"
          style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px;"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(cta.label)}
        </a>
      </p>
    `
    : '';

  const footerHtml = footer
    ? `<p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">${escapeHtml(footer)}</p>`
    : '';

  return `
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
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(intro)}</p>
                <div style="margin:0 0 20px;padding:14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  ${fieldRows}
                </div>
                ${ctaHtml}
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
};
