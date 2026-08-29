import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError } from "../../lib/api";
import { DEFAULT_SUB_BANNER_COLOR } from "../ColumnHeader";
import type { User } from "../../types";

const DEFAULT_BANNER = "#059669"; // emerald-600, the app's built-in default
const DEFAULT_BACKGROUND = "#f8fafc"; // slate-50
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ThemePatch = {
  bannerColor?: string | null;
  subBannerColor?: string | null;
  backgroundColor?: string | null;
  leftImage?: string | null;
  rightImage?: string | null;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ThemeTab() {
  const { user, updateUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"left" | "right" | null>(null);
  const leftInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function saveTheme(patch: ThemePatch) {
    setError(null);
    try {
      const updated = await api.patch<User>("/users/me/theme", patch);
      updateUser(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save theme");
    }
  }

  async function handleImageChange(side: "left" | "right", file: File | null) {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image is too large -- please pick one under 5MB");
      return;
    }
    setUploading(side);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await saveTheme(side === "left" ? { leftImage: dataUrl } : { rightImage: dataUrl });
    } catch {
      setError("Failed to read image");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Colors</h3>
        <div className="flex gap-6">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Banner color
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={user.themeBannerColor ?? DEFAULT_BANNER}
                onChange={(e) => saveTheme({ bannerColor: e.target.value })}
                className="h-8 w-14 rounded border border-slate-200"
              />
              {user.themeBannerColor && (
                <button
                  type="button"
                  onClick={() => saveTheme({ bannerColor: null })}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Reset
                </button>
              )}
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Sub-banner color
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={user.themeSubBannerColor ?? DEFAULT_SUB_BANNER_COLOR}
                onChange={(e) => saveTheme({ subBannerColor: e.target.value })}
                className="h-8 w-14 rounded border border-slate-200"
              />
              {user.themeSubBannerColor && (
                <button
                  type="button"
                  onClick={() => saveTheme({ subBannerColor: null })}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Reset
                </button>
              )}
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Background color
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={user.themeBackgroundColor ?? DEFAULT_BACKGROUND}
                onChange={(e) => saveTheme({ backgroundColor: e.target.value })}
                className="h-8 w-14 rounded border border-slate-200"
              />
              {user.themeBackgroundColor && (
                <button
                  type="button"
                  onClick={() => saveTheme({ backgroundColor: null })}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Reset
                </button>
              )}
            </div>
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Panel backgrounds</h3>
        <p className="mb-3 text-xs text-slate-400">
          Optional -- shown faded behind the Tasks/Schedule and Notes panels so text stays
          readable.
        </p>
        <div className="flex gap-6">
          {(
            [
              { side: "left" as const, label: "Tasks & Schedule", image: user.themeLeftImage, ref: leftInputRef },
              { side: "right" as const, label: "Notes", image: user.themeRightImage, ref: rightInputRef },
            ]
          ).map(({ side, label, image, ref }) => (
            <div key={side} className="flex flex-col gap-1 text-sm text-slate-600">
              {label}
              <div className="relative h-24 w-36 overflow-hidden rounded border border-slate-200 bg-slate-50">
                {image && (
                  <img src={image} alt="" className="h-full w-full object-cover" />
                )}
                {image && (
                  <button
                    type="button"
                    aria-label={`Remove ${label} image`}
                    onClick={() => saveTheme(side === "left" ? { leftImage: null } : { rightImage: null })}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <input
                ref={ref}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(side, e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => ref.current?.click()}
                disabled={uploading === side}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                {uploading === side ? "Uploading..." : image ? "Change image" : "Upload image"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
