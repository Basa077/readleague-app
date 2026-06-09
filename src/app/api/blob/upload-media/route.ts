import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MAX_VIDEO_BYTES } from "@/lib/config";

// Issues short-lived client tokens so the browser can upload a feed IMAGE
// directly to Vercel Blob (same pattern as book uploads, different content
// types + smaller cap). The post row is created by the createPost action once
// the upload returns a URL.
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Sign in to post.");
        return {
          allowedContentTypes: [
            "image/png", "image/jpeg", "image/webp", "image/gif",
            "video/mp4", "video/webm", "video/quicktime",
          ],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 }
    );
  }
}
