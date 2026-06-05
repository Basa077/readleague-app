import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MAX_BOOK_BYTES } from "@/lib/config";

// Issues short-lived client tokens so the browser can upload a book file
// DIRECTLY to Vercel Blob, without the bytes passing through a Serverless
// Function (which caps request bodies at ~4.5MB). This is what lets readers and
// coordinators add real-sized EPUBs/PDFs. The book row itself is created by the
// finalize server action once the upload returns a URL.
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        // Only signed-in users may upload.
        const user = await getCurrentUser();
        if (!user) throw new Error("Sign in to upload a book.");
        return {
          allowedContentTypes: ["application/pdf", "application/epub+zip"],
          maximumSizeInBytes: MAX_BOOK_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      // The browser gets the blob URL back from upload() and hands it to the
      // finalize action, so there's nothing to persist here. (This callback only
      // fires via webhook in production anyway.)
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
