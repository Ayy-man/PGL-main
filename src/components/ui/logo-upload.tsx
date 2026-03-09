"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";

interface LogoUploadProps {
  tenantId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
}

export function LogoUpload({
  tenantId,
  currentUrl,
  onUploaded,
  onRemoved,
}: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);

      // Client-side validation
      if (file.size > 2 * 1024 * 1024) {
        setError("File size exceeds 2MB limit");
        return;
      }

      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/svg+xml",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Allowed: PNG, JPG, SVG, WebP");
        return;
      }

      // Show local preview immediately
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tenantId", tenantId);

        const res = await fetch("/api/upload/logo", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        // Replace local preview with actual URL
        URL.revokeObjectURL(localUrl);
        setPreview(data.url);
        onUploaded(data.url);
      } catch (err) {
        URL.revokeObjectURL(localUrl);
        setPreview(currentUrl);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [tenantId, currentUrl, onUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
    },
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      // Reset input so re-selecting the same file triggers onChange
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleUpload]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    onRemoved?.();
  }, [onRemoved]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="relative cursor-pointer rounded-[14px] border-2 border-dashed transition-colors duration-200"
        style={{
          borderColor: isDragOver
            ? "var(--gold-primary)"
            : "var(--border-subtle)",
          backgroundColor: isDragOver ? "var(--gold-bg)" : "transparent",
          minHeight: preview ? "auto" : "160px",
        }}
      >
        {preview ? (
          /* Preview state */
          <div className="relative flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Tenant logo"
              className="rounded-lg object-cover"
              style={{ maxWidth: "120px", maxHeight: "120px" }}
            />

            {/* Remove button */}
            {!isUploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute flex items-center justify-center rounded-full transition-colors duration-150"
                style={{
                  top: "8px",
                  right: "8px",
                  width: "20px",
                  height: "20px",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  color: "var(--text-primary-ds)",
                }}
                aria-label="Remove logo"
              >
                <X size={12} />
              </button>
            )}

            {/* Uploading overlay */}
            {isUploading && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-[14px]"
                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              >
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ color: "var(--gold-primary)" }}
                />
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-2 p-6">
            <Upload
              size={28}
              style={{ color: "var(--text-primary-ds)", opacity: 0.5 }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary-ds)" }}
            >
              Drop logo or click to browse
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--admin-text-secondary)" }}
            >
              PNG, JPG, SVG, WebP &middot; Max 2MB
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs" style={{ color: "oklch(0.62 0.19 22)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
