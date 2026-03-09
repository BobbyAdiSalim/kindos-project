import { getNotificationTransport } from './notification-transport/transport-factory.js';
import { getEmailStrategy } from './email-strategy-factory.js';

export const sendEmailByType = async ({ type, to, data = {} }) => {
  if (!to) return;

  const strategy = getEmailStrategy(type);
  const transport = getNotificationTransport();
  const built = strategy.build(data);

  await transport.send({
    to,
    subject: built.subject,
    text: built.text,
    html: built.html,
    label: strategy.getLabel ? strategy.getLabel() : type,
  });
};
