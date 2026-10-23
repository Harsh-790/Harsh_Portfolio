'use server';

/* ══════════════════════════════════════════════════════════════
   Admin server actions.

   These are thin, authenticated wrappers around the Express API.
   The backend owns Prisma, MongoDB, GridFS, password hashing and
   every validation rule; the browser never receives a database
   connection or an API secret.

   Every action re-checks the session through requireAdmin(), then
   revalidates the public site so edits appear immediately.
   ══════════════════════════════════════════════════════════════ */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, adminJson, backendJson, readApiError } from '@/lib/api';
import { endSession, requireAdmin, startSession } from '@/lib/auth';
import { formDataToObject } from '@/lib/forms';

export type ActionState = { ok: boolean; message: string; id?: string; errors?: Record<string, string> } | null;

type ActionResult = { ok: boolean; message: string; id?: string; errors?: Record<string, string> };

function refresh() {
  revalidatePath('/', 'layout');
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function trimmed(formData: FormData, key: string): string {
  return text(formData, key).trim();
}

async function saveAction(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH',
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    const result = await adminJson<ActionResult>(path, jsonInit(method, formDataToObject(formData)));
    if (result.ok) refresh();
    return result;
  } catch (error) {
    const { message } = await readApiError(error);
    return { ok: false, message };
  }
}

/* ══ authentication ══════════════════════════════════════════ */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = trimmed(formData, 'email');
  const password = text(formData, 'password');

  if (!email || !password) return { ok: false, message: 'Email and password are required.' };

  try {
    const data = await backendJson<{ token: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    await startSession(data.token);
  } catch (error) {
    const { message } = await readApiError(error);
    // Do not reveal whether the email exists; surface other failures (such as
    // the API being unreachable) so they are not mistaken for a bad password.
    return {
      ok: false,
      message:
        error instanceof ApiError && error.status === 401
          ? 'Those credentials did not match our records.'
          : message,
    };
  }

  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect('/admin/login');
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const current = text(formData, 'currentPassword');
  const next = text(formData, 'newPassword');
  const confirm = text(formData, 'confirmPassword');

  if (next.length < 8) return { ok: false, message: 'Use at least 8 characters for the new password.' };
  if (next !== confirm) return { ok: false, message: 'The two new passwords do not match.' };

  try {
    return await adminJson<ActionResult>(
      '/api/auth/change-password',
      jsonInit('POST', { currentPassword: current, newPassword: next }),
    );
  } catch (error) {
    const { message } = await readApiError(error);
    return { ok: false, message };
  }
}

/* ══ content ═════════════════════════════════════════════════ */

export async function saveProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return saveAction('/api/admin/profile', 'PUT', formData);
}

export async function saveProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = trimmed(formData, 'id');
  return saveAction(id ? `/api/admin/projects/${id}` : '/api/admin/projects', id ? 'PUT' : 'POST', formData);
}

export async function saveExperienceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = trimmed(formData, 'id');
  return saveAction(
    id ? `/api/admin/experience/${id}` : '/api/admin/experience',
    id ? 'PUT' : 'POST',
    formData,
  );
}

export async function saveSkillAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = trimmed(formData, 'id');
  return saveAction(id ? `/api/admin/skills/${id}` : '/api/admin/skills', id ? 'PUT' : 'POST', formData);
}

export async function saveGalleryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = trimmed(formData, 'id');
  return saveAction(id ? `/api/admin/gallery/${id}` : '/api/admin/gallery', id ? 'PUT' : 'POST', formData);
}

export async function saveSocialAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = trimmed(formData, 'id');
  return saveAction(
    id ? `/api/admin/social-links/${id}` : '/api/admin/social-links',
    id ? 'PUT' : 'POST',
    formData,
  );
}

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return saveAction('/api/admin/settings', 'PUT', formData);
}

export async function resetSettingsAction(): Promise<void> {
  await requireAdmin();
  await adminJson<ActionResult>('/api/admin/settings/reset', { method: 'POST' });
  refresh();
  redirect('/admin/settings?reset=1');
}

export async function saveThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return saveAction('/api/admin/theme', 'PUT', formData);
}

/* ══ messages ════════════════════════════════════════════════ */

export async function setMessageReadAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = trimmed(formData, 'id');
  const read = trimmed(formData, 'read') !== 'false';
  await adminJson(`/api/admin/messages/${id}/read`, jsonInit('PATCH', { read }));
  refresh();
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = trimmed(formData, 'id');
  await adminJson(`/api/admin/messages/${id}`, { method: 'DELETE' });
  refresh();
}

/* ══ generic list helpers (delete / reorder / toggle) ════════ */

export async function deleteRecordAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const resource = trimmed(formData, 'resource');
  const id = trimmed(formData, 'id');
  await adminJson(`/api/admin/records/${encodeURIComponent(resource)}/${id}`, { method: 'DELETE' });
  refresh();
}

export async function toggleRecordAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const resource = trimmed(formData, 'resource');
  const id = trimmed(formData, 'id');
  const field = trimmed(formData, 'field');
  await adminJson(
    `/api/admin/records/${encodeURIComponent(resource)}/${id}/toggle`,
    jsonInit('PATCH', { field }),
  );
  refresh();
}

export async function moveRecordAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const resource = trimmed(formData, 'resource');
  const id = trimmed(formData, 'id');
  await adminJson(
    `/api/admin/records/${encodeURIComponent(resource)}/${id}/move`,
    jsonInit('POST', {
      direction: trimmed(formData, 'direction'),
      scopeField: trimmed(formData, 'scopeField'),
      scopeValue: trimmed(formData, 'scopeValue'),
    }),
  );
  refresh();
}

/** Used by the "duplicate" button on the projects list. */
export async function duplicateProjectAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = trimmed(formData, 'id');
  await adminJson(`/api/admin/projects/${id}/duplicate`, { method: 'POST' });
  refresh();
}
