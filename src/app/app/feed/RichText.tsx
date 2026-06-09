"use client";

import Link from "next/link";

/** Renders post text with clickable #hashtags. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(#\w{1,40})/g);
  return (
    <>
      {parts.map((p, i) =>
        /^#\w{1,40}$/.test(p) ? (
          <Link key={i} href={`/app/feed/tag/${p.slice(1).toLowerCase()}`} className="font-medium hover:underline" style={{ color: "var(--accent-ink)" }}>
            {p}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

/** Image or video for a post/story. */
export function PostMedia({
  imageUrl,
  videoUrl,
  rounded = true,
  className = "",
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  rounded?: boolean;
  className?: string;
}) {
  const r = rounded ? "rounded-lg" : "";
  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        className={`${r} w-full max-h-[30rem] bg-black ${className}`}
        style={{ border: "0.5px solid var(--line)" }}
      />
    );
  }
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={`${r} w-full max-h-[30rem] object-cover ${className}`} style={{ border: "0.5px solid var(--line)" }} />;
  }
  return null;
}
