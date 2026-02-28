"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tenant route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <div className="space-y-2 text-center">
        <h2 className="font-serif text-2xl font-semibold">
          Something went wrong
        </h2>
        <p className="text-muted-foreground max-w-md">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
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
  );
}
