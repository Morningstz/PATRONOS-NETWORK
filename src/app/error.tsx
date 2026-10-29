"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Hook for Sentry (or equivalent): Sentry.captureException(error)
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl px-4 py-28 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display mt-3 text-[3rem]">We couldn&rsquo;t load this page.</h1>
      <p className="mt-4 text-muted">Please try again. If it keeps happening, let us know{error.digest ? ` (reference ${error.digest})` : ""}.</p>
      <button onClick={reset} className="btn btn-solid mt-8">Try again</button>
    </div>
  );
}
