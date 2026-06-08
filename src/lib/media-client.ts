"use client";

import { upload } from "@vercel/blob/client";
import { MAX_IMAGE_BYTES } from "@/lib/config";

/** Uploads a feed image straight from the browser to Vercel Blob, returning the
 *  public URL the createPost action then stores. */
export async function uploadFeedImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image.");
  if (file.size === 0) throw new Error("That image looks empty.");
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large (max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB).`);
  }
  const safeName = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]+/gi, "_")}`;
  const blob = await upload(`feed/${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload-media",
    contentType: file.type,
  });
  return blob.url;
}
