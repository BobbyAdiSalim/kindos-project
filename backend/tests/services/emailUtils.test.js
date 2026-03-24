const MODULE_PATH = '../../services/email-strategy/utils.js';

describe('email utils', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports FRONTEND_URL with trailing slash removed', async () => {
    process.env.FRONTEND_URL = 'https://example.com/';
    const { FRONTEND_URL } = await import(MODULE_PATH);

    expect(FRONTEND_URL).toBe('https://example.com');
  });

  it('escapes dangerous html characters', async () => {
    const { escapeHtml } = await import(MODULE_PATH);
    expect(escapeHtml('<a href="x">&\'\'</a>')).toContain('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&#39;&lt;/a&gt;');
  });

  it('formats pretty dates and times and falls back for invalid values', async () => {
    const { toPrettyDate, toPrettyTime } = await import(MODULE_PATH);

    expect(toPrettyDate('2026-03-20')).toContain('2026');
    expect(toPrettyDate('bad-date')).toBe('bad-date');
    expect(toPrettyDate('')).toBe('');

    expect(toPrettyTime('13:05:00')).toBe('1:05 PM');
    expect(toPrettyTime('00:00')).toBe('12:00 AM');
    expect(toPrettyTime(3)).toBe('');
  });

  it('formats appointment type and builds card html with optional sections', async () => {
    const { formatAppointmentType, cardHtml } = await import(MODULE_PATH);

    expect(formatAppointmentType('in-person')).toBe('In-Person');
    expect(formatAppointmentType('virtual')).toBe('Virtual');

    const withCta = cardHtml({
      title: 'Title',
      intro: 'Intro',
      fields: [{ label: 'A', value: 'B' }],
      cta: { href: 'https://example.com', label: 'Go' },
      footer: 'Footer',
    });
    expect(withCta).toContain('Go');
    expect(withCta).toContain('Footer');

    const withoutCta = cardHtml({
      title: 'No CTA',
      intro: 'Plain',
      fields: [],
    });
    expect(withoutCta).not.toContain('target="_blank"');
  });
});
