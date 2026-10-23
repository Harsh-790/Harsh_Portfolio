import { prisma } from '../lib/prisma';
import { getSetting } from '../lib/settings';

export type ContactState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Public contact form — stored in MongoDB so nothing is faked. */
export async function submitContactMessage(body: Record<string, unknown>): Promise<ContactState> {
  const name = text(body, 'name');
  const email = text(body, 'email');
  const subject = text(body, 'subject');
  const messageBody = text(body, 'body');
  const trap = text(body, 'company');

  // Bots fill every field they find; humans never see this one.
  if (trap) {
    return { ok: true, message: await getSetting('contact.successMessage') };
  }

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = 'Please add your name.';
  if (!EMAIL.test(email)) errors.email = 'Please add a valid email address.';
  if (messageBody.length < 12) errors.body = 'A little more detail helps — at least a sentence.';

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: 'Please check the highlighted fields.', errors };
  }

  await prisma.message.create({
    data: {
      name,
      email,
      subject: subject.slice(0, 160),
      body: messageBody.slice(0, 5000),
    },
  });

  return {
    ok: true,
    message: (await getSetting('contact.successMessage')) || 'Thank you — your message has been sent.',
  };
}
