'use client';

import { useActionState, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  changePasswordAction,
  loginAction,
  saveProfileAction,
  saveSettingsAction,
  saveThemeAction,
  type ActionState,
} from '@/app/admin/actions';
import { ACCENT_PRESETS, THEME_MODES, type SettingField, type SettingGroup } from '@/lib/schemas';
import { cn, jsonArray, rowsToText, type Profile, type Settings, type Stat } from '@/lib/types';
import { Field, MediaPicker, Select, StatusBanner, SubmitButton, TextArea, Toggle } from './Fields';

/* ── shared ────────────────────────────────────────────────── */

function Group({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card p-5 md:p-6', className)}>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
        <h2 className="display text-[14px]">{title}</h2>
        {description && <p className="label max-w-[52ch]">{description}</p>}
      </header>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function SaveBar({ state, label, pendingText }: { state: ActionState; label: string; pendingText?: string }) {
  return (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-t border-line bg-bg/95 pt-4 pb-4 backdrop-blur">
      <StatusBanner state={state} />
      <SubmitButton pendingLabel={pendingText ?? 'Saving'}>{label}</SubmitButton>
    </div>
  );
}

/* ── login ─────────────────────────────────────────────────── */

export function LoginForm() {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <form action={action} className="space-y-5">
      <Field label="Email" name="email" type="email" required autoComplete="username" placeholder="you@example.com" />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" />

      {state && !state.ok && (
        <p
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-fg px-3.5 py-3 font-mono text-[10.5px] tracking-[0.12em] uppercase"
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 pt-1">
        <Link href="/" className="label transition-colors hover:text-fg">
          ← Back to site
        </Link>
        <SubmitButton pendingLabel="Checking">Sign in</SubmitButton>
      </div>
    </form>
  );
}

/* ── profile ───────────────────────────────────────────────── */

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfileAction, null);

  return (
    <form action={action} className="space-y-6">
      <Group title="Identity" description="Used in the header, hero, footer and metadata.">
        <Field label="Name" name="name" defaultValue={profile.name} required />
        <Field label="Role" name="role" defaultValue={profile.role} hint="Short label, e.g. Data Scientist." />
        <Field label="Headline" name="headline" defaultValue={profile.headline} hint="Uppercase line under the name." />
        <Field label="Tagline" name="tagline" defaultValue={profile.tagline} hint="One sentence, shown in quotes." />
        <Field label="Location" name="location" defaultValue={profile.location} />
        <Field label="Years of experience" name="yearsExp" defaultValue={profile.yearsExp} />
        <Field label="Current role" name="currentRole" defaultValue={profile.currentRole} />
        <Field label="Company" name="company" defaultValue={profile.company} />
        <Field label="Email" name="email" type="email" defaultValue={profile.email} />
        <Field label="Phone" name="phone" defaultValue={profile.phone} />
        <Field
          label="Status"
          name="status"
          defaultValue={profile.status}
          hint="e.g. Open to data science roles"
          className="md:col-span-2"
        />
      </Group>

      <Group title="Profile text">
        <div className="md:col-span-2">
          <TextArea label="Short intro" name="intro" defaultValue={profile.intro} rows={3} hint="Used under the hero heading." />
        </div>
        <div className="md:col-span-2">
          <TextArea
            label="Biography"
            name="bio"
            defaultValue={profile.bio}
            rows={10}
            hint="Blank lines start a new paragraph. Shown on /about."
          />
        </div>
        <div className="md:col-span-2">
          <TextArea
            label="Approach"
            name="approach"
            defaultValue={profile.approach}
            rows={8}
            hint="One step per line as Title | description. Rendered as the numbered approach grid."
          />
        </div>
        <div className="md:col-span-2">
          <TextArea
            label="Education & certificates"
            name="education"
            defaultValue={profile.education}
            rows={6}
            hint="One per line as 2020 — 2024 | Qualification — Institution."
          />
        </div>
        <div className="md:col-span-2">
          <TextArea
            label="Areas of interest"
            name="interests"
            defaultValue={profile.interests}
            rows={3}
            hint="Comma separated — shown as tags."
          />
        </div>
      </Group>

      <Group title="Media" description="The portrait is reused on the homepage and /about.">
        <MediaPicker name="avatar" label="Profile photo" defaultValue={profile.avatar} />
        <MediaPicker
          name="resumeUrl"
          label="Résumé / CV"
          defaultValue={profile.resumeUrl}
          accept="application/pdf"
          hint="PDF. Powers every “Download CV” button."
        />
      </Group>

      <SaveBar state={state} label="Save profile" />
    </form>
  );
}

/* ── site text settings ────────────────────────────────────── */

function SettingInput({ field, value }: { field: SettingField; value: string }) {
  const type = field.type ?? 'text';

  if (type === 'select') {
    return <Select label={field.label} name={field.key} options={field.options ?? []} defaultValue={value} hint={field.hint} />;
  }

  if (type === 'toggle') {
    return (
      <div className="md:col-span-2">
        <Toggle label={field.label} name={field.key} defaultChecked={value === 'on'} hint={field.hint} />
      </div>
    );
  }

  if (type === 'media') {
    return (
      <div className="md:col-span-2">
        <MediaPicker name={field.key} label={field.label} defaultValue={value} hint={field.hint} />
      </div>
    );
  }

  if (type === 'stats') {
    const rows = jsonArray<Stat>(value, []);
    return (
      <TextArea
        label={field.label}
        name={field.key}
        defaultValue={rowsToText(rows)}
        rows={5}
        hint={field.hint}
        placeholder="Projects shipped | 09 | production + research"
        className="md:col-span-2"
      />
    );
  }

  if (type === 'textarea' || type === 'lines') {
    return (
      <TextArea
        label={field.label}
        name={field.key}
        defaultValue={value}
        rows={field.rows ?? 3}
        hint={field.hint}
        className="md:col-span-2"
      />
    );
  }

  return <Field label={field.label} name={field.key} defaultValue={value} hint={field.hint} />;
}

export function SettingsForm({ groups, values }: { groups: SettingGroup[]; values: Settings }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSettingsAction, null);
  const keys = groups.flatMap((group) => group.fields.map((field) => field.key));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="__keys" value={keys.join(',')} />

      {groups.map((group) => (
        <Group key={group.id} title={group.title} description={group.note}>
          {group.fields.map((field) => (
            <SettingInput key={field.key} field={field} value={values[field.key] ?? ''} />
          ))}
        </Group>
      ))}

      <SaveBar state={state} label="Save all text" />
    </form>
  );
}

/* ── theme ─────────────────────────────────────────────────── */

/** Accept "6f2d18", "#6F2D18" or "#abc" and show the canonical hex in the form. */
function cleanAccent(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return raw;
  return `#${hex.toUpperCase()}`;
}

export function ThemeForm({ values }: { values: Settings }) {
  const [state, action] = useActionState<ActionState, FormData>(saveThemeAction, null);
  const [mode, setMode] = useState(values['theme.defaultMode'] || 'light');
  const [accent, setAccent] = useState(cleanAccent(values['theme.accent'] || '#6F2D18'));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="theme.defaultMode" value={mode} />
      <input type="hidden" name="theme.accent" value={accent} />

      <Group title="Default mode" description="Visitors land on this mode. Their own choice is remembered in the browser.">
        <div className="md:col-span-2 flex flex-wrap gap-2">
          {THEME_MODES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              aria-pressed={mode === option}
              className={cn('chip capitalize', mode === option && 'chip-active')}
            >
              {option === 'color' ? 'Colour' : option}
            </button>
          ))}
        </div>
        <div className="md:col-span-2 rounded-xl border border-line p-4">
          <p className="label mb-3">Preview</p>
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
            style={{
              background: mode === 'dark' ? '#08080a' : mode === 'color' ? '#ecdfce' : '#fafaf8',
              borderColor: mode === 'dark' ? '#232328' : mode === 'color' ? '#d6c1aa' : '#e5e5df',
            }}
          >
            <span
              style={{ color: mode === 'dark' ? '#f2f1ee' : '#0e0e0f' }}
              className="font-mono text-[11px] tracking-[0.2em] uppercase"
            >
              Aa / Data scientist
            </span>
            <span
              className="rounded-full px-3 py-1 font-mono text-[10px] tracking-widest text-white uppercase"
              style={{ background: mode === 'color' ? accent : mode === 'dark' ? '#f2f1ee' : '#0e0e0f', color: mode === 'dark' ? '#0b0b0c' : '#fff' }}
            >
              Accent
            </span>
          </div>
        </div>
      </Group>

      <Group title="Colour-mode accent" description="Only used in colour mode. Keep it away from blue to stay on brand.">
        <div className="md:col-span-2">
          <span className="field-label">Presets</span>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setAccent(preset.value)}
                aria-pressed={accent.toLowerCase() === preset.value.toLowerCase()}
                className={cn('chip', accent.toLowerCase() === preset.value.toLowerCase() && 'chip-active')}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: preset.value }} aria-hidden />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="accent-hex">
            Custom hex
          </label>
          <input
            id="accent-hex"
            value={accent}
            onChange={(event) => setAccent(event.target.value)}
            onBlur={() => setAccent((current) => cleanAccent(current) || '#6F2D18')}
            className="field"
            placeholder="#6F2D18"
          />
          <p className="field-hint">Hex value, e.g. #6F2D18 — the # is added if you leave it out.</p>
        </div>
        <div>
          <span className="field-label">Swatch</span>
          <div className="flex h-[42px] items-center gap-3 rounded-xl border border-line px-3.5">
            <span className="h-4 w-4 rounded-full border border-line" style={{ background: accent }} aria-hidden />
            <span className="label label-fg">{accent}</span>
          </div>
        </div>
      </Group>

      <SaveBar state={state} label="Save theme" />
    </form>
  );
}

/* ── password ──────────────────────────────────────────────── */

export function PasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePasswordAction, null);

  return (
    <form action={action} className="space-y-6">
      <Group title="Change password" description="Passwords are hashed with bcrypt. The session stays signed in.">
        <Field label="Current password" name="currentPassword" type="password" required autoComplete="current-password" />
        <div />
        <Field label="New password" name="newPassword" type="password" required autoComplete="new-password" hint="At least 8 characters." />
        <Field label="Repeat new password" name="confirmPassword" type="password" required autoComplete="new-password" />
      </Group>
      <SaveBar state={state} label="Update password" />
    </form>
  );
}

/* ── misc ──────────────────────────────────────────────────── */
