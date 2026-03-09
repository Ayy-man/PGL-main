"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
          <div className="space-y-2 text-center">
            <h2 className="font-serif text-3xl font-bold">
              Something went wrong
            </h2>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-[8px] px-6 text-sm font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))",
              border: "1px solid var(--border-gold)",
              color: "var(--gold-primary)",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
