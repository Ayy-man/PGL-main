"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pencil,
  Users,
  Compass,
  Lock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Image from "next/image";
import { toggleTenantStatus } from "@/app/actions/admin";
import { TenantActivityCard } from "@/components/admin/tenant-activity-card";

// ── Types ─────────────────────────────────────────────────────────

interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
  created_at: string;
}

interface HealthData {
  score: number;
  breakdown: {
    activity: number;
    engagement: number;
    adoption: number;
    freshness: number;
  };
  status: "healthy" | "warning" | "critical";
}

interface SparklinePoint {
  date: string;
  value: number;
}

interface UsageData {
  totals: {
    logins: number;
    searches: number;
    profiles_viewed: number;
    profiles_enriched: number;
    csv_exports: number;
  };
  sparklines: Record<string, SparklinePoint[]>;
  changes: Record<string, string>;
}

interface PersonaData {
  id: string;
  name: string;
  last_used_at: string | null;
  filters: Record<string, unknown> | null;
}

interface TenantDetailDrawerProps {
  tenantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helpers ───────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function scoreColor(score: number): string {
  if (score >= 60) return "oklch(0.7 0.15 145)";
  if (score >= 30) return "oklch(0.75 0.15 85)";
  return "oklch(0.6 0.2 25)";
}

// ── Sparkline SVG ────────────────────────────────────────────────

function MiniSparkline({
  data,
  width = 60,
  height = 24,
  stroke = "var(--gold-primary)",
}: {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (!data || data.length < 2) return null;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Area Chart SVG (for Growth card) ─────────────────────────────

function AreaChart({
  data,
  width = 500,
  height = 80,
}: {
  data: SparklinePoint[];
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return null;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polygon
        points={areaPoints}
        fill="var(--gold-primary)"
        fillOpacity="0.1"
      />
      <polyline
        points={linePoints}
        fill="none"
        stroke="var(--gold-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Health Score Ring ─────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute font-serif text-2xl font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ── Sub-Metric Bar ───────────────────────────────────────────────

function SubMetricBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "var(--gold-primary)",
          }}
        />
      </div>
    </div>
  );
}

// ── Initial Circle ───────────────────────────────────────────────

function InitialCircle({
  name,
  size = 48,
  logoUrl,
}: {
  name: string;
  size?: number;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-serif font-bold"
      style={{
        width: size,
        height: size,
        background: "var(--gold-bg-strong)",
        color: "var(--gold-primary)",
        fontSize: size * 0.45,
      }}
    >
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

// ── Drawer Header (Task 3) ───────────────────────────────────────

function DrawerHeader({
  tenant,
  onNameSaved,
}: {
  tenant: TenantData;
  onNameSaved: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tenant.name);
  const [isToggling, setIsToggling] = useState(false);
  const [isActive, setIsActive] = useState(tenant.is_active);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(tenant.name);
    setIsActive(tenant.is_active);
  }, [tenant.name, tenant.is_active]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const saveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === tenant.name) {
      setEditName(tenant.name);
      setIsEditing(false);
      return;
    }
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        onNameSaved(trimmed);
      }
    } catch {
      // Revert on failure
      setEditName(tenant.name);
    }
    setIsEditing(false);
  };

  const handleToggle = async () => {
    setIsToggling(true);
    const newStatus = !isActive;
    setIsActive(newStatus);
    try {
      await toggleTenantStatus(tenant.id);
    } catch {
      setIsActive(!newStatus);
    }
    setIsToggling(false);
  };

  return (
    <div className="flex items-start gap-4">
      <InitialCircle name={tenant.name} size={48} logoUrl={tenant.logo_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setEditName(tenant.name);
                  setIsEditing(false);
                }
              }}
              className="font-serif text-xl font-bold bg-transparent border-b outline-none"
              style={{
                color: "var(--text-primary-ds)",
                borderColor: "var(--border-gold)",
              }}
            />
          ) : (
            <>
              <SheetTitle className="font-serif text-xl font-bold truncate" style={{ color: "var(--text-primary-ds)" }}>
                {tenant.name}
              </SheetTitle>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
        <p className="text-xs truncate" style={{ color: "var(--admin-text-secondary)" }}>
          /{tenant.slug}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isActive
                ? "bg-[var(--success-muted)] text-[var(--success)]"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
          <span className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
            Created {new Date(tenant.created_at).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <div
              className="rounded-full"
              style={{
                width: 16,
                height: 16,
                background: tenant.primary_color || "#d4af37",
              }}
            />
            <div
              className="rounded-full"
              style={{
                width: 16,
                height: 16,
                background: tenant.secondary_color || "#f4d47f",
              }}
            />
          </div>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        disabled={isToggling}
        className={`flex-shrink-0 inline-flex h-8 items-center rounded-[8px] px-3 text-xs font-medium transition-colors ${
          isActive
            ? "bg-[var(--success-muted)] text-[var(--success)] hover:bg-[var(--success-muted)]"
            : "bg-destructive/10 text-destructive hover:bg-destructive/15"
        } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isToggling ? "Updating..." : isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}

// ── Seat Utilization Card (Task 4) ───────────────────────────────

function SeatUtilizationCard({ users }: { users: TenantUser[] }) {
  const activeCount = users.filter((u) => u.is_active).length;
  const totalCount = users.length;
  const pct = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;

  return (
    <div className="surface-admin-card rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-sm font-semibold" style={{ color: "var(--text-primary-ds)" }}>
          Team
        </h3>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: "var(--gold-bg)",
            color: "var(--gold-primary)",
          }}
        >
          {activeCount}/{totalCount} active
        </span>
      </div>
      <div className="h-2 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "var(--gold-primary)",
          }}
        />
      </div>
      <div className="space-y-2 max-h-[180px] overflow-y-auto">
        {users.slice(0, 5).map((user) => (
          <div key={user.id} className="flex items-center gap-3 py-1">
            <InitialCircle name={user.full_name || user.email} size={24} />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: "var(--text-primary-ds)" }}>
                {user.full_name || user.email.split("@")[0]}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--admin-text-secondary)" }}>
                {user.email}
              </p>
            </div>
            <span
              className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium"
              style={{
                border: "1px solid var(--border-gold)",
                color: "var(--gold-primary)",
              }}
            >
              {user.role}
            </span>
            <span className="flex-shrink-0 text-[10px]" style={{ color: "var(--admin-text-secondary)" }}>
              {relativeTime(user.last_sign_in_at)}
            </span>
          </div>
        ))}
      </div>
      <button
        className="w-full mt-3 inline-flex h-8 items-center justify-center gap-2 rounded-[8px] text-xs font-medium transition-colors"
        style={{
          border: "1px solid var(--border-gold)",
          color: "var(--gold-primary)",
        }}
        disabled
      >
        <Users className="h-3.5 w-3.5" />
        Invite User
      </button>
    </div>
  );
}

// ── Health Score Card (Task 5) ───────────────────────────────────

function HealthScoreCard({ health }: { health: HealthData }) {
  return (
    <div className="surface-admin-card rounded-[14px] p-4">
      <h3 className="font-serif text-sm font-semibold mb-3" style={{ color: "var(--text-primary-ds)" }}>
        Health Score
      </h3>
      <div className="flex justify-center mb-4">
        <HealthRing score={health.score} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SubMetricBar label="Activity" value={health.breakdown.activity} max={30} />
        <SubMetricBar label="Engagement" value={health.breakdown.engagement} max={25} />
        <SubMetricBar label="Adoption" value={health.breakdown.adoption} max={25} />
        <SubMetricBar label="Freshness" value={health.breakdown.freshness} max={20} />
      </div>
    </div>
  );
}

// ── Usage Stats Card (Task 6) ────────────────────────────────────

function UsageStatsCard({ usage }: { usage: UsageData }) {
  const metrics = [
    { label: "Searches", key: "searches", value: usage.totals.searches },
    { label: "Profile Views", key: "profiles_viewed", value: usage.totals.profiles_viewed },
    { label: "Enrichments", key: "profiles_enriched", value: usage.totals.profiles_enriched },
    { label: "Exports", key: "csv_exports", value: usage.totals.csv_exports },
  ];

  return (
    <div className="surface-admin-card rounded-[14px] p-4">
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="font-serif text-sm font-semibold" style={{ color: "var(--text-primary-ds)" }}>
          Usage
        </h3>
        <span className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
          (30 days)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const change = usage.changes[m.key] ?? "0%";
          const isPositive = change.startsWith("+") && change !== "+0%";
          const isNegative = change.startsWith("-");
          return (
            <div key={m.key} className="space-y-1">
              <p className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
                {m.label}
              </p>
              <p className="font-serif text-lg" style={{ color: "var(--gold-primary)" }}>
                {m.value.toLocaleString()}
              </p>
              <MiniSparkline data={usage.sparklines[m.key] ?? []} width={60} height={24} />
              <div className="flex items-center gap-1">
                {isPositive && <TrendingUp className="h-3 w-3" style={{ color: "var(--success)" }} />}
                {isNegative && <TrendingDown className="h-3 w-3 text-destructive" />}
                <span
                  className="text-[10px]"
                  style={{
                    color: isPositive
                      ? "var(--success)"
                      : isNegative
                      ? "var(--destructive)"
                      : "var(--admin-text-secondary)",
                  }}
                >
                  {change}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top Personas Card (Task 7) ───────────────────────────────────

function TopPersonasCard({ personas }: { personas: PersonaData[] }) {
  function extractTags(filters: Record<string, unknown> | null): string[] {
    if (!filters) return [];
    const tags: string[] = [];
    const keys = ["title", "industry", "seniority"] as const;
    for (const key of keys) {
      const val = filters[key];
      if (typeof val === "string" && val.trim()) {
        tags.push(val.trim());
      } else if (Array.isArray(val)) {
        for (const item of val.slice(0, 1)) {
          if (typeof item === "string" && item.trim()) tags.push(item.trim());
        }
      }
      if (tags.length >= 3) break;
    }
    return tags.slice(0, 3);
  }

  if (personas.length === 0) {
    return (
      <div className="surface-admin-card rounded-[14px] p-4">
        <h3 className="font-serif text-sm font-semibold mb-3" style={{ color: "var(--text-primary-ds)" }}>
          Top Personas
        </h3>
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Compass className="h-8 w-8" style={{ color: "var(--admin-text-secondary)" }} />
          <p className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
            No personas created yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-admin-card rounded-[14px] p-4">
      <h3 className="font-serif text-sm font-semibold mb-3" style={{ color: "var(--text-primary-ds)" }}>
        Top Personas
      </h3>
      <div className="space-y-3">
        {personas.map((persona) => {
          const tags = extractTags(persona.filters);
          return (
            <div key={persona.id}>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary-ds)" }}>
                {persona.name}
              </p>
              <p className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
                {persona.last_used_at
                  ? `Last used: ${relativeTime(persona.last_used_at)}`
                  : "Never used"}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px]"
                      style={{
                        background: "var(--gold-bg)",
                        color: "var(--gold-primary)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Growth Trend Card (Task 8) ───────────────────────────────────

function GrowthTrendCard({ sparklines }: { sparklines: Record<string, SparklinePoint[]> }) {
  // Combine all sparkline data into a single series (total activity per day)
  const searchData = sparklines.searches ?? [];

  if (searchData.length < 2) {
    return (
      <div className="surface-admin-card rounded-[14px] p-4">
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="font-serif text-sm font-semibold" style={{ color: "var(--text-primary-ds)" }}>
            Growth
          </h3>
          <span className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
            (90 days)
          </span>
        </div>
        <div className="flex items-center justify-center py-6">
          <p className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
            Not enough data yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-admin-card rounded-[14px] p-4">
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="font-serif text-sm font-semibold" style={{ color: "var(--text-primary-ds)" }}>
          Growth
        </h3>
        <span className="text-xs" style={{ color: "var(--admin-text-secondary)" }}>
          (90 days)
        </span>
      </div>
      <AreaChart data={searchData} />
    </div>
  );
}

// ── Quota / Limits Card (Task 9) ─────────────────────────────────

function QuotaLimitsCard() {
  return (
    <div className="surface-admin-card rounded-[14px] p-4">
      <h3 className="font-serif text-sm font-semibold mb-3" style={{ color: "var(--text-primary-ds)" }}>
        Quota & Limits
      </h3>
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <Lock className="h-8 w-8" style={{ color: "var(--admin-text-secondary)" }} />
        <p className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
          Coming soon
        </p>
      </div>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-[8px]" />
      </div>
      {/* Card skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="surface-admin-card rounded-[14px] p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

// ── Main Drawer Component (Task 2) ──────────────────────────────

export function TenantDetailDrawer({
  tenantId,
  open,
  onOpenChange,
}: TenantDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [personas, setPersonas] = useState<PersonaData[]>([]);

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [tenantRes, usageRes, healthRes, personasRes] = await Promise.all([
        fetch(`/api/admin/tenants/${id}`),
        fetch(`/api/admin/tenants/${id}/usage`),
        fetch(`/api/admin/tenants/${id}/health`),
        fetch(`/api/admin/tenants/${id}/personas`),
      ]);

      const [tenantData, usageData, healthData, personasData] =
        await Promise.all([
          tenantRes.ok ? tenantRes.json() : null,
          usageRes.ok ? usageRes.json() : null,
          healthRes.ok ? healthRes.json() : null,
          personasRes.ok ? personasRes.json() : null,
        ]);

      if (tenantData) {
        setTenant(tenantData.tenant);
        setUsers(tenantData.users ?? []);
      }
      if (usageData) setUsage(usageData);
      if (healthData) setHealth(healthData);
      if (personasData) setPersonas(personasData.personas ?? []);
    } catch (err) {
      console.error("Failed to fetch tenant details:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && tenantId) {
      fetchData(tenantId);
    }
    if (!open) {
      // Reset state when closing
      setTenant(null);
      setUsers([]);
      setHealth(null);
      setUsage(null);
      setPersonas([]);
    }
  }, [open, tenantId, fetchData]);

  const handleNameSaved = (name: string) => {
    if (tenant) {
      setTenant({ ...tenant, name });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[580px] sm:max-w-[580px] p-0 overflow-hidden flex flex-col"
        style={{
          background: "var(--admin-card-bg, var(--background))",
          borderColor: "var(--border-subtle)",
        }}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Tenant Details</SheetTitle>
          <SheetDescription>View and manage tenant information</SheetDescription>
        </SheetHeader>

        {loading || !tenant ? (
          <DrawerSkeleton />
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Task 3: Header */}
            <DrawerHeader tenant={tenant} onNameSaved={handleNameSaved} />

            {/* Task 4: Seat Utilization */}
            <SeatUtilizationCard users={users} />

            {/* Task 5: Health Score */}
            {health && <HealthScoreCard health={health} />}

            {/* Task 6: Usage Stats */}
            {usage && <UsageStatsCard usage={usage} />}

            {/* Task 7: Top Personas */}
            <TopPersonasCard personas={personas} />

            {/* Task 8: Growth Trend */}
            {usage && <GrowthTrendCard sparklines={usage.sparklines} />}

            {/* Task 9: Quota / Limits */}
            <QuotaLimitsCard />

            {/* Activity Card with 3-level drill-down */}
            <TenantActivityCard tenantId={tenant.id} tenantName={tenant.name} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
