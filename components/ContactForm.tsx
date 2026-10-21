'use client';

import { useActionState } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, Send } from 'lucide-react';
import { submitContactMessage, type ContactState } from '@/app/actions/contact';

const initialState: ContactState = null;

export default function ContactForm({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  const [state, action, pending] = useActionState(submitContactMessage, initialState);

  if (state?.ok) {
    return (
      <div className="card flex h-full min-h-[320px] flex-col items-start justify-center gap-4 p-8">
        <CircleCheck className="h-6 w-6 text-accent" aria-hidden />
        <p className="display type-4">Message received</p>
        <p className="body max-w-[40ch]">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card p-6 md:p-8" noValidate>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="display type-4">{title}</h2>
        <span className="label">Form 01</span>
      </div>
      <p className="body mt-3 text-[13.5px]">{note}</p>
      <div className="mt-6 h-px w-full bg-line" aria-hidden />

      {state && !state.ok && (
        <p
          role="alert"
          className="mt-6 flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 font-mono text-[10.5px] tracking-wider text-fg uppercase"
        >
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" error={state?.errors?.name} autoComplete="name" required />
        <Field
          label="Email"
          name="email"
          type="email"
          error={state?.errors?.email}
          autoComplete="email"
          required
        />
      </div>

      <div className="mt-5">
        <Field label="Subject" name="subject" autoComplete="off" placeholder="Optional" />
      </div>

      <div className="mt-5">
        <label className="field-label" htmlFor="body">
          Message <span aria-hidden>*</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={5}
          required
          minLength={12}
          aria-invalid={Boolean(state?.errors?.body)}
          aria-describedby={state?.errors?.body ? 'body-error' : undefined}
          placeholder="What are you trying to measure?"
          className="field resize-y"
        />
        {state?.errors?.body && (
          <p id="body-error" className="field-hint text-fg">
            {state.errors.body}
          </p>
        )}
      </div>

      {/* honeypot */}
      <div className="sr-only" aria-hidden>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <button type="submit" className="btn btn-solid" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Sending
            </>
          ) : (
            <>
              Send message
              <Send className="h-3.5 w-3.5" aria-hidden />
            </>
          )}
        </button>
        <p className="label">Stored privately · never shared</p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  error,
  autoComplete,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label} {required && <span aria-hidden>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="field"
      />
      {error && (
        <p id={`${name}-error`} className="field-hint text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
