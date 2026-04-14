import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 bg-background text-foreground">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-6xl font-semibold text-[var(--text-primary-ds)]">
          404
        </h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center rounded-[8px] bg-[var(--gold-primary)] px-4 py-2 text-sm font-bold text-[var(--gold-foreground,#0a0a0a)] hover:bg-[var(--gold-bright)] transition-colors"
      >
        Return home
      </Link>
    </div>
  );
}
