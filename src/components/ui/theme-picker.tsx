"use client";

import { Check } from "lucide-react";
import { TENANT_THEMES } from "@/lib/tenant-theme";

interface ThemePickerProps {
  value: string;
  onChange: (theme: string) => void;
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {Object.entries(TENANT_THEMES).map(([key, config]) => {
          const isSelected = value === key;

          return (
            <button
              key={key}
              type="button"
              title={config.label}
              aria-label={config.label}
              onClick={() => onChange(key)}
              className="relative flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${config.main}, ${config.accent})`,
                border: isSelected
                  ? "2px solid transparent"
                  : "2px solid var(--border-subtle)",
                boxShadow: isSelected
                  ? `0 0 0 2px ${config.main}, 0 0 12px ${config.main}40`
                  : "none",
                transform: "scale(1)",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              }}
            >
              {isSelected && (
                <Check className="h-4 w-4" style={{ color: "#ffffff" }} />
              )}
            </button>
          );
        })}
      </div>
      <span
        className="text-xs mt-2 block"
        style={{ color: "var(--admin-text-secondary)" }}
      >
        {TENANT_THEMES[value as keyof typeof TENANT_THEMES]?.label || "Gold"}
      </span>
    </div>
  );
}
