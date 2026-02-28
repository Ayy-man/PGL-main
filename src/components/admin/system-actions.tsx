"use client";

import { Key, Database, Megaphone, Download, Zap } from "lucide-react";

const SYSTEM_ACTIONS = [
  { icon: Key, label: "Rotate Master Keys" },
  { icon: Database, label: "Flush Cache (Global)" },
  { icon: Megaphone, label: "Broadcast Alert" },
  { icon: Download, label: "Export System Logs" },
];

export function SystemActions() {
  return (
    <div className="surface-admin-card rounded-[14px] overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <h3
          className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
          style={{ color: "var(--text-primary-ds)" }}
        >
          <Zap className="h-[18px] w-[18px]" style={{ color: "var(--gold-primary)" }} />
          System Actions
        </h3>
      </div>

      {/* 2x2 Grid */}
      <div className="p-5 grid grid-cols-2 gap-4 flex-1">
        {SYSTEM_ACTIONS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="p-4 rounded-lg flex flex-col items-start gap-2 text-left transition-all"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.30)";
              const icon = e.currentTarget.querySelector("svg");
              if (icon) (icon as SVGElement).style.color = "var(--gold-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              const icon = e.currentTarget.querySelector("svg");
              if (icon) (icon as SVGElement).style.color = "var(--admin-text-secondary)";
            }}
            onClick={() => {
              // Stub — no-op for now
              console.log(`[SystemActions] ${label} clicked (stub)`);
            }}
            title="Coming soon"
          >
            <Icon
              className="h-5 w-5 transition-colors"
              style={{ color: "var(--admin-text-secondary)" }}
            />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary-ds)" }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
