"use client";

import { useState } from "react";
import { ExternalLink, Loader2, CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import type { IntegrationStatus, IntegrationId } from "@/types/admin-api-keys";
import { StatusBadge } from "./status-badge";
import { BreakerBadge } from "./breaker-badge";

interface TestResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
  detail?: string;
  skipped?: boolean;
}

interface IntegrationCardProps {
  integration: IntegrationStatus;
  onMockModeChange?: (id: IntegrationId, value: boolean) => void;
}

const CATEGORY_LABEL: Record<IntegrationStatus["category"], string> = {
  enrichment: "Enrichment",
  infra: "Infrastructure",
  ai: "AI / LLM",
};

export function IntegrationCard({ integration, onMockModeChange }: IntegrationCardProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [mockBusy, setMockBusy] = useState(false);
  const [mockOn, setMockOn] = useState(integration.mockModeActive);

  async function runTest() {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/api-keys/test/${integration.id}`, {
        method: "POST",
      });
      const data = (await res.json()) as TestResult;
      setResult(data);
    } catch (err) {
      setResult({
        ok: false,
        latencyMs: 0,
        error: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setTesting(false);
    }
  }

  async function toggleMock() {
    setMockBusy(true);
    const next = !mockOn;
    try {
      const res = await fetch("/api/admin/api-keys/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "apollo_mock_enrichment",
          value: next,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMockOn(next);
      onMockModeChange?.(integration.id, next);
    } catch (err) {
      console.error("[IntegrationCard] mock toggle failed:", err);
    } finally {
      setMockBusy(false);
    }
  }

  return (
    <div
      className="surface-card flex flex-col gap-4 rounded-[12px] p-5"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-ghost)" }}
          >
            {CATEGORY_LABEL[integration.category]}
          </p>
          <h3
            className="text-base font-semibold truncate"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {integration.label}
          </h3>
          <p
            className="text-xs"
            style={{ color: "var(--admin-text-secondary, var(--text-secondary-ds))" }}
          >
            {integration.description}
          </p>
        </div>
        <StatusBadge
          status={integration.status}
          mockActive={integration.hasMockMode && mockOn}
        />
      </div>

      {/* Env vars section */}
      <div className="flex flex-col gap-1.5">
        {integration.envVars.map((envVar) => (
          <div
            key={envVar.name}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <code
              className="font-mono truncate"
              style={{ color: "var(--text-secondary-ds)" }}
              title={envVar.name}
            >
              {envVar.name}
            </code>
            <span
              className="font-mono text-[11px]"
              style={{
                color: envVar.configured
                  ? "var(--gold-text)"
                  : "oklch(0.62 0.19 22)",
              }}
            >
              {envVar.preview ?? "— not set —"}
            </span>
          </div>
        ))}
      </div>

      {/* Mock mode toggle (Apollo only) */}
      {integration.hasMockMode && (
        <div
          className="flex items-center justify-between rounded-[8px] px-3 py-2.5"
          style={{
            background: "color-mix(in oklch, var(--gold-primary) 6%, transparent)",
            border: "1px solid color-mix(in oklch, var(--gold-primary) 20%, transparent)",
          }}
        >
          <div className="flex flex-col">
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--gold-text)" }}
            >
              Mock Enrichment Mode
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-secondary-ds)" }}>
              Zero credits consumed
            </span>
          </div>
          <button
            type="button"
            onClick={toggleMock}
            disabled={mockBusy}
            aria-pressed={mockOn}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            style={{
              background: mockOn
                ? "var(--gold-primary)"
                : "var(--border-subtle)",
              opacity: mockBusy ? 0.5 : 1,
            }}
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
              style={{
                background: "var(--bg-root)",
                transform: mockOn ? "translateX(20px)" : "translateX(4px)",
              }}
            />
          </button>
        </div>
      )}

      {/* Breaker + docs link */}
      <div className="flex items-center justify-between gap-3">
        <BreakerBadge state={integration.breakerState} />
        <a
          href={integration.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium"
          style={{ color: "var(--gold-text)" }}
        >
          Docs <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Test button + result */}
      {integration.supportsTest && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={runTest}
            disabled={testing || integration.status === "missing"}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "color-mix(in oklch, var(--gold-primary) 12%, transparent)",
              color: "var(--gold-text)",
              border: "1px solid color-mix(in oklch, var(--gold-primary) 30%, transparent)",
            }}
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            Test Connection
          </button>
          {result && (
            <div
              className="flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[11px]"
              style={{
                background: result.ok
                  ? "color-mix(in oklch, var(--success) 10%, transparent)"
                  : "color-mix(in oklch, oklch(0.62 0.19 22) 10%, transparent)",
                color: result.ok
                  ? "var(--success)"
                  : "oklch(0.62 0.19 22)",
              }}
            >
              {result.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="font-mono">
                {result.ok
                  ? `OK · ${result.latencyMs}ms${result.detail ? ` · ${result.detail}` : ""}`
                  : result.skipped
                    ? `SKIPPED · ${result.error ?? "not supported"}`
                    : `FAIL · ${result.error ?? "unknown error"}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
