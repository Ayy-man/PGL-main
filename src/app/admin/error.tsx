'use client';

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      icon={AlertTriangle}
      title="Something went wrong"
      description={error.message || "An unexpected error occurred."}
    >
      <Button variant="gold" onClick={reset}>Try again</Button>
      {error.digest && (
        <p className="text-xs font-mono text-muted-foreground mt-4">Error ID: {error.digest}</p>
      )}
    </EmptyState>
  );
}
