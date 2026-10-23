'use client';

import { useActionState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveExperienceAction,
  saveGalleryAction,
  saveProjectAction,
  saveSkillAction,
  saveSocialAction,
  type ActionState,
} from '@/app/admin/actions';
import { Field, MediaListField, MediaPicker, Select, StatusBanner, SubmitButton, TextArea, Toggle } from './Fields';
import {
  GALLERY_CATEGORIES,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  SKILL_CATEGORIES,
  SOCIAL_PLATFORMS,
} from '@/lib/options';
import {
  listToText,
  rowsToText,
  type Experience,
  type GalleryItem,
  type Project,
  type Skill,
  type SocialLink,
} from '@/lib/types';

/* ── shared layout bits ────────────────────────────────────── */

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
    <section className="card p-5 md:p-6">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="display text-[14px]">{title}</h2>
        {description && <p className="label max-w-[46ch]">{description}</p>}
      </header>
      {/* space-y-5 keeps the 20px rhythm that SiteForms' grid uses; without it the
          fields sit flush against each other and a hint runs into the next label */}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Text input with suggestions — admins can pick a known value or type a new one. */
function Combo({
  label,
  name,
  defaultValue,
  options,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: string[];
  hint?: string;
}) {
  const listId = `${name}-options`;
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} list={listId} defaultValue={defaultValue} className="field" />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function SaveBar({ state, label }: { state: ActionState; label: string }) {
  return (
    <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line bg-bg/95 pt-4 pb-4 backdrop-blur">
      <StatusBanner state={state} />
      <SubmitButton>{label}</SubmitButton>
    </div>
  );
}

/**
 * A create returns the new record's id: jump straight to its edit view so the
 * form is bound to a real record and a second save can never duplicate it.
 */
function useEditAfterCreate(state: ActionState, item: { id: string } | null | undefined, path: string) {
  const router = useRouter();
  useEffect(() => {
    if (!item && state?.ok && state.id) router.replace(`${path}?edit=${state.id}&saved=1`);
  }, [state, item, router, path]);
}

/* ── projects ──────────────────────────────────────────────── */

export function ProjectForm({ project }: { project?: Project | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProjectAction, null);
  useEditAfterCreate(state, project, '/admin/projects');

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={project?.id ?? ''} />

      <Group title="Basics">
        <Field label="Title" name="title" defaultValue={project?.title} required hint="Shown on cards and the detail page." />
        <Field label="Slug" name="slug" defaultValue={project?.slug} hint="Leave empty to generate from the title." />
        <Combo label="Category" name="category" defaultValue={project?.category ?? 'Machine Learning'} options={PROJECT_CATEGORIES} />
        <Combo label="Status" name="status" defaultValue={project?.status ?? 'Completed'} options={PROJECT_STATUSES} />
        <Field label="Year / date" name="date" defaultValue={project?.date} placeholder="2025" />
        <Field label="Order" name="order" type="number" defaultValue={project?.order ?? 0} hint="Lower numbers appear first." />
        <TextArea
          label="Summary"
          name="summary"
          defaultValue={project?.summary}
          rows={3}
          placeholder="One or two sentences used on cards."
        />
      </Group>

      <Group title="Cover & demo" description="Upload directly, or reuse anything already in the media library.">
        <MediaPicker name="thumbnail" label="Cover image" defaultValue={project?.thumbnail} />
        <MediaPicker
          name="videoUrl"
          label="Demo video"
          defaultValue={project?.videoUrl}
          allowVideo
          accept="video/*"
          hint="MP4 / WebM upload, or a YouTube / Vimeo link."
        />
      </Group>

      <Group title="Case study" description="Each block is rendered as its own numbered section on the project page.">
        <TextArea label="Overview" name="overview" defaultValue={project?.overview} rows={4} />
        <TextArea label="The problem" name="problem" defaultValue={project?.problem} rows={4} />
        <TextArea label="Approach" name="approach" defaultValue={project?.approach} rows={4} />
        <TextArea label="Dataset" name="datasetInfo" defaultValue={project?.datasetInfo} rows={4} />
        <TextArea label="Model" name="modelInfo" defaultValue={project?.modelInfo} rows={4} />
        <TextArea label="Results" name="results" defaultValue={project?.results} rows={4} />
      </Group>

      <Group title="Metadata" description="Technologies are chips, metrics are the numbers in the side panel.">
        <TextArea
          label="Technologies"
          name="technologies"
          defaultValue={listToText(project?.technologies ?? [])}
          rows={5}
          hint="One per line."
        />
        <TextArea
          label="Metrics"
          name="metrics"
          defaultValue={rowsToText(project?.metrics ?? [])}
          rows={5}
          hint="One per line: Label | Value | Note"
        />
      </Group>

      <Group title="Screenshots" description="Appear in the figure grid on the project page.">
        <div className="md:col-span-2">
          <MediaListField name="gallery" label="Project images" defaultValues={project?.gallery ?? []} />
        </div>
      </Group>

      <Group title="Links">
        <Field label="GitHub" name="githubUrl" defaultValue={project?.githubUrl} placeholder="https://github.com/…" />
        <Field label="Live demo" name="liveUrl" defaultValue={project?.liveUrl} placeholder="https://…" />
        <Field label="Dataset" name="datasetUrl" defaultValue={project?.datasetUrl} placeholder="https://…" />
      </Group>

      <Group title="Visibility">
        <Toggle name="featured" label="Featured on the homepage" defaultChecked={project?.featured} />
        <Toggle name="published" label="Published" defaultChecked={project?.published ?? false} hint="New projects stay hidden until you switch this on." />
      </Group>

      <SaveBar state={state} label={project ? 'Save project' : 'Create project'} />
    </form>
  );
}

/* ── experience ────────────────────────────────────────────── */

export function ExperienceForm({ item }: { item?: Experience | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveExperienceAction, null);
  useEditAfterCreate(state, item, '/admin/experience');

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={item?.id ?? ''} />

      <Group title="Role">
        <Field label="Organisation" name="company" defaultValue={item?.company} required />
        <Field label="Position" name="position" defaultValue={item?.position} />
        <Field label="Location" name="location" defaultValue={item?.location} placeholder="Remote / Bengaluru" />
        <Field label="Order" name="order" type="number" defaultValue={item?.order ?? 0} />
        <Field label="Start" name="startDate" defaultValue={item?.startDate} placeholder="Mar 2024" />
        <Field label="End" name="endDate" defaultValue={item?.endDate} placeholder="Leave empty if current" />
      </Group>

      <Group title="Details">
        <div className="md:col-span-2">
          <TextArea label="Description" name="description" defaultValue={item?.description} rows={3} />
        </div>
        <TextArea
          label="Achievements"
          name="achievements"
          defaultValue={listToText(item?.achievements ?? [])}
          rows={5}
          hint="One per line. Rendered as bullet points."
        />
        <TextArea
          label="Technologies"
          name="technologies"
          defaultValue={listToText(item?.technologies ?? [])}
          rows={5}
          hint="One per line."
        />
      </Group>

      <Group title="Visibility">
        <Toggle name="current" label="This is my current role" defaultChecked={item?.current} />
        <Toggle name="published" label="Published" defaultChecked={item?.published ?? false} hint="New entries stay hidden until you switch this on." />
      </Group>

      <SaveBar state={state} label={item ? 'Save role' : 'Add role'} />
    </form>
  );
}

/* ── skills ────────────────────────────────────────────────── */

export function SkillForm({ item }: { item?: Skill | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSkillAction, null);
  useEditAfterCreate(state, item, '/admin/skills');

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={item?.id ?? ''} />

      <Group title="Skill">
        <Field label="Name" name="name" defaultValue={item?.name} required />
        <Combo label="Category" name="category" defaultValue={item?.category ?? 'Tools'} options={SKILL_CATEGORIES} />
        <Field
          label="Note"
          name="note"
          defaultValue={item?.note}
          hint="Short qualifier, e.g. “pipelines, model selection”."
        />
        <Field label="Order" name="order" type="number" defaultValue={item?.order ?? 0} />
        <Toggle
          name="highlight"
          label="Used weekly"
          defaultChecked={item?.highlight}
          hint="Shows a marker in the skills lists."
        />
        <Toggle name="published" label="Published" defaultChecked={item?.published ?? false} hint="New entries stay hidden until you switch this on." />
      </Group>

      <SaveBar state={state} label={item ? 'Save skill' : 'Add skill'} />
    </form>
  );
}

/* ── gallery ───────────────────────────────────────────────── */

export function GalleryForm({ item }: { item?: GalleryItem | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveGalleryAction, null);
  useEditAfterCreate(state, item, '/admin/gallery');

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={item?.id ?? ''} />

      <Group title="Media">
        <Select
          label="Type"
          name="type"
          options={['photo', 'video']}
          defaultValue={item?.type ?? 'photo'}
          hint="Videos open in a player, photos in the lightbox."
        />
        <MediaPicker
          name="url"
          label="File or URL"
          defaultValue={item?.url}
          allowVideo
          accept="image/*"
          hint="For video you can also paste a YouTube or Vimeo link."
        />
      </Group>

      <Group title="Details">
        <Field label="Title" name="title" defaultValue={item?.title} />
        <Combo label="Category" name="category" defaultValue={item?.category ?? 'Photos'} options={GALLERY_CATEGORIES} />
        <Field label="Date" name="date" defaultValue={item?.date} placeholder="2025" />
        <Field label="Order" name="order" type="number" defaultValue={item?.order ?? 0} />
        <div className="md:col-span-2">
          <TextArea label="Description" name="description" defaultValue={item?.description} rows={3} />
        </div>
      </Group>

      <Group title="Visibility">
        <Toggle name="featured" label="Featured" defaultChecked={item?.featured} />
        <Toggle name="published" label="Published" defaultChecked={item?.published ?? false} hint="New entries stay hidden until you switch this on." />
      </Group>

      <SaveBar state={state} label={item ? 'Save item' : 'Add item'} />
    </form>
  );
}

/* ── social links ──────────────────────────────────────────── */

export function SocialForm({ link }: { link?: SocialLink | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSocialAction, null);
  useEditAfterCreate(state, link, '/admin/social');

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={link?.id ?? ''} />

      <Group title="Profile" description="Leaving the URL empty hides this icon everywhere on the site.">
        <Select label="Platform" name="platform" options={SOCIAL_PLATFORMS} defaultValue={link?.platform ?? 'github'} />
        <Field label="Label" name="label" defaultValue={link?.label} hint="Shown in footers and lists." />
        <Field
          label="URL"
          name="url"
          defaultValue={link?.url}
          placeholder="https://…"
          hint="For email use a plain address — the mailto link is built automatically."
          className="md:col-span-2"
        />
        <Field label="Order" name="order" type="number" defaultValue={link?.order ?? 0} />
        <Toggle name="enabled" label="Show this link" defaultChecked={link?.enabled ?? true} />
      </Group>

      <SaveBar state={state} label={link ? 'Save link' : 'Add link'} />
    </form>
  );
}

/* ── helpers used by the pages ─────────────────────────────── */
