const consoleTransport = {
  async send({ to, subject, text, label }) {
    if (!to) return;
    console.log(`[${label || 'Email'}]`);
    console.log(`To: ${to}`);
    if (subject) console.log(`Subject: ${subject}`);
    if (text) console.log(text);
  },
};

export default consoleTransport;
