'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getSetting } from '@/lib/settings';

export type ContactState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
} | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Public contact form → stored in the database so nothing is faked. */
export async function submitContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const trap = String(formData.get('company') ?? '').trim();

  // Bots fill every field they find; humans never see this one.
  if (trap) {
    return { ok: true, message: await getSetting('contact.successMessage') };
  }

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = 'Please add your name.';
  if (!EMAIL.test(email)) errors.email = 'Please add a valid email address.';
  if (body.length < 12) errors.body = 'A little more detail helps — at least a sentence.';

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: 'Please check the highlighted fields.', errors };
  }

  await db.message.create({
    data: { name, email, subject: subject.slice(0, 160), body: body.slice(0, 5000) },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/messages');

  return { ok: true, message: await getSetting('contact.successMessage') };
}
