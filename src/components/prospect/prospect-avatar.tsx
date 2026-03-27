"use client";

import { useState, useEffect } from "react";
import { getAvatarUrl } from "@/lib/avatar";

interface ProspectAvatarProps {
  name: string;
  photoUrl?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_PX: Record<NonNullable<ProspectAvatarProps["size"]>, number> = {
  sm: 28,
  md: 48,
  lg: 112,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function getAvatarGradient(name: string): string {
  const hue =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 30%, 25%), hsl(${hue}, 20%, 15%))`;
}

type Stage = "photo" | "gravatar" | "initials";

function getInitialStage(
  photoUrl?: string | null,
  email?: string | null
): Stage {
  if (photoUrl && photoUrl.trim() !== "") return "photo";
  if (email && email.trim() !== "") return "gravatar";
  return "initials";
}

export function ProspectAvatar({
  name,
  photoUrl,
  email,
  size = "md",
  className,
}: ProspectAvatarProps) {
  const [stage, setStage] = useState<Stage>(() =>
    getInitialStage(photoUrl, email)
  );

  // Reset stage when photoUrl/email change (e.g. after enrichment)
  useEffect(() => {
    setStage(getInitialStage(photoUrl, email));
  }, [photoUrl, email]);

  const px = SIZE_PX[size];
  const avatarGradient = getAvatarGradient(name);
  const initials = getInitials(name);

  const borderWidth = size === "lg" ? "3px" : "2px";
  const fontSize =
    size === "lg" ? undefined : size === "sm" ? "10px" : undefined;
  const fontClass =
    size === "lg"
      ? "font-serif text-3xl font-semibold"
      : size === "sm"
        ? "text-[10px] font-semibold"
        : "text-sm font-semibold";

  if (stage === "initials") {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 ${fontClass}${className ? ` ${className}` : ""}`}
        style={{
          width: px,
          height: px,
          border: `${borderWidth} solid var(--border-default)`,
          background: avatarGradient,
          color: "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
          fontSize: size === "sm" ? fontSize : undefined,
        }}
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  const src =
    stage === "photo"
      ? (getAvatarUrl({ photoUrl, size: px }) ?? "")
      : (getAvatarUrl({ email, size: px }) ?? "");

  const handleError = () => {
    if (stage === "photo") {
      // Try Gravatar next if email exists, else fall to initials
      if (email && email.trim() !== "") {
        setStage("gravatar");
      } else {
        setStage("initials");
      }
    } else {
      // Gravatar returned 404 — fall back to initials
      setStage("initials");
    }
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={px}
      height={px}
      onError={handleError}
      className={`rounded-full object-cover shrink-0${className ? ` ${className}` : ""}`}
      style={{
        width: px,
        height: px,
        border: `${borderWidth} solid var(--border-default)`,
      }}
    />
  );
}
