"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { IntegrationCard } from "@/components/admin/api-keys/integration-card";
import type { IntegrationStatus, IntegrationId } from "@/types/admin-api-keys";

interface ApiResponse {
  integrations: IntegrationStatus[];
  fetchedAt: string;
}

export default function AdminApiKeysPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-keys", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as ApiResponse;
      setIntegrations(data.integrations);
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const handleMockModeChange = useCallback(
    (id: IntegrationId, value: boolean) => {
      setIntegrations((prev) =>
        prev
          ? prev.map((i) =>
              i.id === id ? { ...i, mockModeActive: value } : i
            )
          : prev
      );
    },
    []
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            className="font-medium tracking-wide text-base sm:text-lg"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Integration Configuration
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--admin-text-secondary, var(--text-secondary-ds))" }}
          >
            View, test, and toggle external integration credentials.
            Secret values are never exposed — masked previews only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{
            background: "color-mix(in oklch, var(--gold-primary) 12%, transparent)",
            color: "var(--gold-text)",
            border: "1px solid color-mix(in oklch, var(--gold-primary) 30%, transparent)",
          }}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Security notice */}
      <div
        className="flex items-start gap-3 rounded-[10px] p-4"
        style={{
          background: "color-mix(in oklch, var(--gold-primary) 6%, transparent)",
          border: "1px solid color-mix(in oklch, var(--gold-primary) 20%, transparent)",
        }}
      >
        <ShieldAlert
          className="h-4 w-4 shrink-0 mt-0.5"
          style={{ color: "var(--gold-text)" }}
        />
        <div className="flex-1 text-xs" style={{ color: "var(--text-secondary-ds)" }}>
          <p className="font-semibold mb-1" style={{ color: "var(--gold-text)" }}>
            Secrets are stored server-side only
          </p>
          <p>
            To rotate a key, update the env var in the{" "}
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--gold-text)" }}
            >
              Vercel dashboard
            </a>{" "}
            and redeploy. This page only displays masked previews (first 4 characters + bullets).
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading && integrations === null && (
        <div className="flex items-center justify-center py-16">
          <Loader2
            className="h-6 w-6 animate-spin"
            style={{ color: "var(--gold-primary)" }}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="rounded-[10px] p-4 text-xs"
          style={{
            background: "color-mix(in oklch, oklch(0.62 0.19 22) 10%, transparent)",
            color: "oklch(0.62 0.19 22)",
            border: "1px solid color-mix(in oklch, oklch(0.62 0.19 22) 30%, transparent)",
          }}
        >
          Failed to load integrations: {error}
        </div>
      )}

      {/* Card grid */}
      {integrations && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onMockModeChange={handleMockModeChange}
            />
          ))}
        </div>
      )}

      {/* Footer timestamp */}
      {fetchedAt && (
        <p
          className="text-[10px] text-right"
          style={{ color: "var(--text-ghost)" }}
        >
          Last refreshed: {new Date(fetchedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
