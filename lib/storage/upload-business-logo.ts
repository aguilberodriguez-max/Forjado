import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

/**
 * Uploads to bucket `logos` at `{userId}/logo.{ext}`.
 * Ensure the bucket exists and has appropriate RLS/storage policies.
 */
export async function uploadBusinessLogo(userId: string, file: File): Promise<string> {
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : "png";
  const path = `${userId}/logo.${ext}`;

  const supabase = createBrowserSupabaseClient();
  const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(path);

  return publicUrl;
}
