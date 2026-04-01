"use client";

import { ImageIcon, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { uploadBusinessLogo } from "@/lib/storage/upload-business-logo";

type LogoUploadProps = {
  userId: string;
  /** Short heading above the control */
  label: string;
  /** Primary button text */
  buttonText: string;
  helper?: string;
  currentUrl?: string | null;
  onUploaded: (publicUrl: string) => void;
  onError?: (message: string) => void;
};

export function LogoUpload({
  userId,
  label,
  buttonText,
  helper,
  currentUrl,
  onUploaded,
  onError,
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      onError?.("Invalid file");
      return;
    }
    setLoading(true);
    try {
      const url = await uploadBusinessLogo(userId, file);
      onUploaded(url);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#A3A3A3]">{label}</p>
      {helper ? <p className="text-[11px] text-[#A3A3A3]/80">{helper}</p> : null}
      <div className="flex items-center gap-3">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt=""
            className="h-14 w-14 rounded-lg border border-white/10 object-contain"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-[#0A0A0A]">
            <ImageIcon className="h-6 w-6 text-[#A3A3A3]" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void onPick(e)}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              …
            </span>
          ) : (
            buttonText
          )}
        </button>
      </div>
    </div>
  );
}
