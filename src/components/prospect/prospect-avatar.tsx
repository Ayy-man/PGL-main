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

/**
 * ProspectAvatar — always renders initials as base, overlays loaded image on top.
 * No broken image flash — img is invisible until onLoad confirms it's ready.
 *
 * Cascade: photo_url → Gravatar (via email) → initials (always visible underneath)
 */
export function ProspectAvatar({
  name,
  photoUrl,
  email,
  size = "md",
  className,
}: ProspectAvatarProps) {
  const px = SIZE_PX[size];
  const initials = getInitials(name);
  const gradient = getAvatarGradient(name);
  const borderWidth = size === "lg" ? "3px" : "2px";

  // Build list of image URLs to try in order
  const urls: string[] = [];
  const photoSrc = getAvatarUrl({ photoUrl, size: px });
  if (photoSrc) urls.push(photoSrc);
  if (email && email.trim() !== "" && !photoUrl) {
    // If photoUrl exists, getAvatarUrl already returned it — gravatar is the fallback
    const gravatarSrc = getAvatarUrl({ email, size: px });
    if (gravatarSrc && gravatarSrc !== photoSrc) urls.push(gravatarSrc);
  }
  // If photoUrl is set, also try gravatar as fallback
  if (photoUrl && email && email.trim() !== "") {
    const gravatarSrc = getAvatarUrl({ email, size: px });
    if (gravatarSrc) urls.push(gravatarSrc);
  }

  const [urlIndex, setUrlIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Reset when props change
  useEffect(() => {
    setUrlIndex(0);
    setLoaded(false);
  }, [photoUrl, email]);

  const currentUrl = urls[urlIndex];
  const hasImage = currentUrl && !loaded ? true : loaded;

  const handleLoad = () => setLoaded(true);
  const handleError = () => {
    setLoaded(false);
    if (urlIndex < urls.length - 1) {
      setUrlIndex(urlIndex + 1);
    }
    // If no more URLs, initials stay visible (img is hidden)
  };

  const fontClass =
    size === "lg"
      ? "font-serif text-3xl font-semibold"
      : size === "sm"
        ? "text-[10px] font-semibold"
        : "text-sm font-semibold";

  return (
    <div
      className={`relative rounded-full shrink-0 ${fontClass}${className ? ` ${className}` : ""}`}
      style={{ width: px, height: px }}
      aria-label={name}
    >
      {/* Base layer: always-visible initials */}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{
          background: gradient,
          border: `${borderWidth} solid var(--border-default)`,
          color: "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
        }}
      >
        {initials}
      </div>

      {/* Image layer: invisible until loaded */}
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={currentUrl}
          src={currentUrl}
          alt=""
          width={px}
          height={px}
          onLoad={handleLoad}
          onError={handleError}
          className="absolute inset-0 rounded-full object-cover transition-opacity duration-200"
          style={{
            width: px,
            height: px,
            border: `${borderWidth} solid var(--border-default)`,
            opacity: loaded ? 1 : 0,
          }}
        />
      )}
    </div>
  );
}
