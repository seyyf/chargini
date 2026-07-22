"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

const MAX_PHOTOS = 5;

export interface PhotoUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export function PhotoUploader({ files, onChange }: PhotoUploaderProps) {
  const t = useTranslations();
  // Track object URLs we created so we can revoke them
  const objectUrlsRef = useRef<Map<File, string>>(new Map());

  // Revoke all on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function getPreviewUrl(file: File): string {
    if (!objectUrlsRef.current.has(file)) {
      objectUrlsRef.current.set(file, URL.createObjectURL(file));
    }
    return objectUrlsRef.current.get(file)!;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    const combined = [...files, ...incoming].slice(0, MAX_PHOTOS);
    onChange(combined);
    // Reset input so same files can be re-selected if needed
    e.target.value = "";
  }

  function removeFile(index: number) {
    const file = files[index];
    const url = objectUrlsRef.current.get(file);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(file);
    }
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {files.length < MAX_PHOTOS && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
          <span>+</span>
          <span>{t("host.addPhotos")}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleInputChange}
          />
        </label>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {files.map((file, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPreviewUrl(file)}
                alt={file.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={t("host.remove")}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
