import Link from 'next/link';
import { CircleAlert, RotateCcw } from 'lucide-react';

/**
 * Shared admin outage panel. It has no client-only hooks so it can be rendered
 * directly by the panel layout (when the API is asleep) or by the client error
 * boundaries (when a page throws).
 */
export default function AdminUnavailable({
  message,
  reset,
}: {
  message?: string;
  reset?: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-[520px] rounded-2xl border border-line bg-surface p-8">
        <CircleAlert className="h-6 w-6 text-muted" aria-hidden />
        <h1 className="display type-3 mt-5">Backend temporarily unavailable</h1>
        <p className="body mt-4 text-[14px]">
          The admin panel could not reach the API. The public portfolio is still online and does not depend on the
          backend being awake.
        </p>
        <p className="label mt-4 break-words">{message || 'Please try again in a moment.'}</p>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {reset ? (
            <button type="button" onClick={reset} className="btn btn-solid btn-sm">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </button>
          ) : (
            <a href="/admin" className="btn btn-solid btn-sm">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </a>
          )}
          <Link href="/" className="btn btn-sm">
            Open the portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
