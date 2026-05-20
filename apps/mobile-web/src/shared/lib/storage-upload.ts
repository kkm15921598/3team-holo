import { supabase } from "./supabaseClient";

/**
 * base64 data URL → Supabase Storage 업로드 → 공개 URL 반환.
 *
 * - 버킷: `post-photos` (Supabase 대시보드에서 Public 버킷으로 생성 필요)
 * - 버킷 미존재 / 업로드 실패 시 원본 base64 URL 을 그대로 반환 (graceful fallback).
 *
 * @param dataUrl  base64 data URL (`data:image/...;base64,...`)
 * @param folder   스토리지 경로의 폴더 prefix (예: `posts/post-123` 또는 `comments`)
 */
export async function uploadPhotoToStorage(
  dataUrl: string,
  folder: string,
): Promise<string> {
  if (!dataUrl.startsWith("data:")) return dataUrl; // 이미 URL이면 그대로

  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const ext = mime.split("/")[1]?.split("+")[0] ?? "jpg";

  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: mime });

  const filePath = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-photos")
    .upload(filePath, blob, { contentType: mime, upsert: false });

  if (error) {
    console.warn("Storage 업로드 실패:", error.message, "— base64 fallback 사용");
    return dataUrl;
  }

  const { data } = supabase.storage.from("post-photos").getPublicUrl(filePath);
  return data.publicUrl;
}
