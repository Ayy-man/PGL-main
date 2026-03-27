"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentPhotoUrl: string | null;
  prospectName: string;
  prospectId: string;
  isEditable?: boolean; // RBAC gate
  onPhotoUpdated: (url: string | null) => void;
}

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

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

export function AvatarUpload({
  currentPhotoUrl,
  prospectName,
  prospectId,
  isEditable = false,
  onPhotoUpdated,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(prospectName);
  const gradient = getAvatarGradient(prospectName);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);

      // Client-side validation
      if (file.size > MAX_FILE_SIZE) {
        setError("File size exceeds 2MB limit");
        return;
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError("Invalid file type. Allowed: PNG, JPG, WebP");
        return;
      }

      // Show local preview immediately
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setImageLoaded(false);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/prospects/${prospectId}/photo`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        URL.revokeObjectURL(localUrl);
        setPreviewUrl(data.url);
        onPhotoUpdated(data.url);
      } catch (err) {
        URL.revokeObjectURL(localUrl);
        setPreviewUrl(currentPhotoUrl);
        setError(err instanceof Error ? err.message : "Upload failed");
        console.error("[AvatarUpload] Upload failed:", err);
      } finally {
        setIsUploading(false);
      }
    },
    [prospectId, currentPhotoUrl, onPhotoUpdated]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      // Reset so re-selecting same file triggers onChange
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleUpload]
  );

  const handleClick = useCallback(() => {
    if (!isEditable || isUploading) return;
    inputRef.current?.click();
  }, [isEditable, isUploading]);

  const handleImageError = useCallback(() => {
    setImageLoaded(false);
    setPreviewUrl(null);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload avatar"
      />

      <div
        className={[
          "group relative rounded-full w-24 h-24 shrink-0",
          isEditable && !isUploading ? "cursor-pointer" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleClick}
      >
        {/* Base layer: always-visible initials */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center text-xl font-semibold"
          style={{
            background: gradient,
            border: "3px solid var(--border-default)",
            color: "var(--text-primary-ds, var(--text-primary, #e8e4dc))",
          }}
        >
          {initials}
        </div>

        {/* Image layer: invisible until loaded */}
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={prospectName}
            width={96}
            height={96}
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            className="absolute inset-0 rounded-full object-cover transition-opacity duration-200"
            style={{
              width: 96,
              height: 96,
              border: "3px solid var(--border-default)",
              opacity: imageLoaded ? 1 : 0,
            }}
          />
        )}

        {/* Camera overlay on hover — only when editable */}
        {isEditable && !isUploading && (
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <Camera
              className="w-6 h-6"
              style={{ color: "var(--text-primary-ds, #e8e4dc)" }}
            />
          </div>
        )}

        {/* Uploading spinner overlay */}
        {isUploading && (
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          >
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: "var(--gold-primary)" }}
            />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs" style={{ color: "oklch(0.62 0.19 22)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
