"use client";

import { useEffect, useRef, useState } from "react";
import { createPostAction, type FeedPost } from "@/app/actions/feed";
import { uploadFeedMedia } from "@/lib/media-client";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "R";
}

/** Horizontal tray of active stories + an "add your story" bubble. */
export function StoryTray({ stories, meName, onPosted }: { stories: FeedPost[]; meName: string; onPosted: () => void }) {
  const [composing, setComposing] = useState(false);
  const [viewerAt, setViewerAt] = useState<number | null>(null);

  return (
    <div className="rl-card p-3">
      <div className="flex items-center gap-3 overflow-x-auto rl-scroll pb-1">
        <button onClick={() => setComposing(true)} className="flex flex-col items-center gap-1 shrink-0 w-16" title="Add to your story">
          <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, border: "2px dashed var(--line)", color: "var(--accent-ink)", fontSize: 24 }}>＋</div>
          <span className="text-[10px] truncate w-full text-center" style={{ color: "var(--ink-3)" }}>Your story</span>
        </button>

        {stories.map((s, i) => (
          <button key={s.id} onClick={() => setViewerAt(i)} className="flex flex-col items-center gap-1 shrink-0 w-16" title={`${s.author.name}'s story`}>
            <div className="rounded-full p-[2px]" style={{ background: "linear-gradient(135deg, var(--accent), #af52de)" }}>
              <div className="rounded-full flex items-center justify-center rl-serif" style={{ width: 52, height: 52, background: "var(--accent-soft)", color: "var(--accent-ink)", fontSize: 18, border: "2px solid var(--paper)" }}>
                {initials(s.author.name)}
              </div>
            </div>
            <span className="text-[10px] truncate w-full text-center">{s.author.name.split(" ")[0]}</span>
          </button>
        ))}

        {stories.length === 0 && (
          <span className="text-[12px] pl-1" style={{ color: "var(--ink-3)" }}>No stories yet — share a moment from your reading.</span>
        )}
      </div>

      {composing && <StoryComposer meName={meName} onClose={() => setComposing(false)} onPosted={() => { setComposing(false); onPosted(); }} />}
      {viewerAt !== null && <StoryViewer stories={stories} startIndex={viewerAt} onClose={() => setViewerAt(null)} />}
    </div>
  );
}

function StoryComposer({ meName, onClose, onPosted }: { meName: string; onClose: () => void; onPosted: () => void }) {
  const [media, setMedia] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try { setMedia(await uploadFeedMedia(file)); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const post = async () => {
    if (!media || posting) return;
    setPosting(true);
    const res = await createPostAction({
      isStory: true,
      body: caption.trim() || undefined,
      imageUrl: media.kind === "image" ? media.url : undefined,
      videoUrl: media.kind === "video" ? media.url : undefined,
    });
    setPosting(false);
    if (res.ok) onPosted();
    else setError(res.error ?? "Could not post story");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3" style={{ background: "rgba(10,8,6,0.6)" }} onClick={onClose}>
      <div className="rl-card w-full max-w-sm p-4" style={{ background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="rl-serif text-lg">Add to your story</div>
          <button onClick={onClose} className="rl-btn text-xs">Close</button>
        </div>

        {media ? (
          media.kind === "video" ? (
            <video src={media.url} controls playsInline className="w-full rounded-lg max-h-72 bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt="" className="w-full rounded-lg max-h-72 object-cover" />
          )
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full rounded-lg flex flex-col items-center justify-center gap-2 py-10" style={{ border: "1px dashed var(--line)", color: "var(--ink-3)" }}>
            <span style={{ fontSize: 32 }}>{uploading ? "⏳" : "📷"}</span>
            <span className="text-sm">{uploading ? "Uploading…" : "Record or upload a photo / video"}</span>
            <span className="text-[11px]">On a phone this opens your camera</span>
          </button>
        )}
        {/* capture opens the camera on mobile for a true "record" flow */}
        <input ref={fileRef} type="file" accept="image/*,video/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />

        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption… (use #tags)" className="w-full rounded-md px-3 py-2 text-sm mt-3" style={{ background: "var(--paper-2)", border: "0.5px solid var(--line)" }} />
        {error && <div className="text-[12px] mt-2" style={{ color: "var(--danger)" }}>{error}</div>}

        <div className="flex justify-end gap-2 mt-3">
          {media && <button onClick={() => setMedia(null)} className="rl-btn text-xs">Change</button>}
          <button onClick={post} disabled={!media || posting} className="rl-btn rl-btn-primary text-sm">{posting ? "Sharing…" : "Share story"}</button>
        </div>
      </div>
    </div>
  );
}

function StoryViewer({ stories, startIndex, onClose }: { stories: FeedPost[]; startIndex: number; onClose: () => void }) {
  const [i, setI] = useState(startIndex);
  const story = stories[i];
  const isVideo = !!story?.videoUrl;

  const next = () => { if (i + 1 >= stories.length) onClose(); else setI(i + 1); };
  const prev = () => setI((v) => Math.max(0, v - 1));

  // Images auto-advance after 5s; videos advance when they end.
  useEffect(() => {
    if (isVideo) return;
    const t = setTimeout(next, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, isVideo]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: "rgba(0,0,0,0.92)" }}>
      {/* progress bars */}
      <div className="flex gap-1 px-3 pt-3">
        {stories.map((_, idx) => (
          <div key={idx} className="h-0.5 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.3)" }}>
            <div style={{ height: "100%", background: "#fff", width: idx < i ? "100%" : idx === i ? "100%" : "0%" }} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="rounded-full flex items-center justify-center rl-serif" style={{ width: 34, height: 34, background: "var(--accent-soft)", color: "var(--accent-ink)", fontSize: 14 }}>{initials(story.author.name)}</div>
          <div className="text-sm font-medium">{story.author.name}</div>
        </div>
        <button onClick={onClose} className="text-white text-xl px-2" aria-label="Close">✕</button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {/* tap zones */}
        <button onClick={prev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" aria-label="Previous" />
        <button onClick={next} className="absolute right-0 top-0 bottom-0 w-2/3 z-10" aria-label="Next" />
        {isVideo ? (
          <video key={story.id} src={story.videoUrl!} autoPlay playsInline controls={false} onEnded={next} className="max-h-full max-w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={story.id} src={story.imageUrl ?? ""} alt="" className="max-h-full max-w-full object-contain" />
        )}
        {story.body && (
          <div className="absolute bottom-6 left-0 right-0 px-6 text-center text-white text-[15px] drop-shadow">{story.body}</div>
        )}
      </div>
    </div>
  );
}
