'use server';

import { revalidatePath } from 'next/cache';
import { backendJson, readApiError } from '@/lib/api';
import { formDataToObject } from '@/lib/forms';

export type ContactState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
} | null;

/** Public contact form → validated and stored by the Express API. */
export async function submitContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  try {
    const result = await backendJson<ContactState>('/api/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formDataToObject(formData)),
    });

    if (result?.ok) {
      revalidatePath('/admin');
      revalidatePath('/admin/messages');
    }

    return result;
  } catch (error) {
    const { message } = await readApiError(error);
    return { ok: false, message };
  }
}
