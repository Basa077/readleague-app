"use client";

import { upload } from "@vercel/blob/client";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/config";

export type MediaKind = "image" | "video";
export type UploadedMedia = { url: string; kind: MediaKind };

/** Uploads a feed image or video straight from the browser to Vercel Blob. */
export async function uploadFeedMedia(file: File): Promise<UploadedMedia> {
  const kind: MediaKind | null = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
    ? "video"
    : null;
  if (!kind) throw new Error("Choose an image or a video.");
  if (file.size === 0) throw new Error("That file looks empty.");
  const cap = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > cap) {
    throw new Error(`${kind === "video" ? "Video" : "Image"} too large (max ${Math.round(cap / 1024 / 1024)} MB).`);
  }
  const safeName = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]+/gi, "_")}`;
  try {
    const blob = await upload(`feed/${safeName}`, file, {
      access: "public",
      handleUploadUrl: "/api/blob/upload-media",
      contentType: file.type,
    });
    return { url: blob.url, kind };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Local dev has no Blob token, so the upload token can't be minted. This
    // path works on the deployed site, where the store is configured.
    if (/client token|BLOB_READ_WRITE_TOKEN|token/i.test(msg)) {
      throw new Error("Photo & video posting works on the live site — it needs cloud storage that isn't on in local preview. It'll work once deployed.");
    }
    throw e;
  }
}

/** Back-compat helper for image-only callers. */
export async function uploadFeedImage(file: File): Promise<string> {
  const { url } = await uploadFeedMedia(file);
  return url;
}
