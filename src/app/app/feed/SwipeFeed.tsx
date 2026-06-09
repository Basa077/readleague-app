"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  toggleLikeAction,
  addCommentAction,
  listCommentsAction,
  createPostAction,
  type FeedPost,
  type CommentDTO,
} from "@/app/actions/feed";
import { RichText } from "./RichText";

/** Full-screen vertical swipe feed (scroll-snap). Built to keep you scrolling. */
export function SwipeFeed({ posts, onClose }: { posts: FeedPost[]; onClose: () => void }) {
  const [commentsFor, setCommentsFor] = useState<FeedPost | null>(null);

  return (
    <div className="fixed inset-0 z-[85]" style={{ background: "#000" }}>
      <button onClick={onClose} className="absolute top-3 left-3 z-30 text-white text-sm px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.4)" }}>✕ Close</button>
      <div className="h-full w-full overflow-y-auto snap-y snap-mandatory rl-scroll">
        {posts.map((p) => (
          <SwipeSlide key={p.id} post={p} onComments={() => setCommentsFor(p)} />
        ))}
        {posts.length === 0 && <div className="h-full flex items-center justify-center text-white/70 text-sm">Nothing to swipe yet.</div>}
      </div>
      {commentsFor && <CommentsSheet post={commentsFor} onClose={() => setCommentsFor(null)} />}
    </div>
  );
}

function SwipeSlide({ post, onComments }: { post: FeedPost; onComments: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [muted, setMuted] = useState(true);

  // Autoplay the video only while this slide is on screen.
  useEffect(() => {
    const el = ref.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio > 0.6) vid.play().catch(() => {});
        else vid.pause();
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const like = async () => {
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    const res = await toggleLikeAction(post.id).catch(() => null);
    if (res) { setLiked(res.liked); setLikeCount(res.count); }
  };

  return (
    <section ref={ref} className="h-full w-full snap-start relative flex items-center justify-center overflow-hidden">
      {/* media background */}
      {post.videoUrl ? (
        <video ref={videoRef} src={post.videoUrl} loop muted={muted} playsInline className="absolute inset-0 w-full h-full object-contain bg-black" onClick={() => setMuted((m) => !m)} />
      ) : post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 rl-hero-gradient" />
      )}
      {/* readability gradient */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 45%)" }} />

      {/* text-only posts show their words centered */}
      {!post.imageUrl && !post.videoUrl && post.body && (
        <div className="relative z-10 px-8 text-center text-white rl-serif text-2xl leading-snug max-w-xl"><RichText text={post.body} /></div>
      )}

      {/* bottom caption */}
      <div className="absolute bottom-6 left-4 right-20 z-20 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{post.author.name}</span>
          {post.author.leagueId && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>{post.author.leagueId}</span>}
        </div>
        {(post.imageUrl || post.videoUrl) && post.body && <p className="text-[14px] leading-snug line-clamp-3"><RichText text={post.body} /></p>}
        {post.book && (
          <Link href={`/app/books/${post.book.id}`} className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[12px]" style={{ background: "rgba(255,255,255,0.18)" }}>
            📖 {post.book.title}
          </Link>
        )}
        {post.videoUrl && <div className="text-[11px] mt-1 opacity-70">tap video to {muted ? "unmute 🔊" : "mute 🔇"}</div>}
      </div>

      {/* right action rail */}
      <div className="absolute right-3 bottom-8 z-20 flex flex-col items-center gap-5 text-white">
        <button onClick={like} className="flex flex-col items-center text-[12px]">
          <span style={{ fontSize: 28 }}>{liked ? "❤️" : "🤍"}</span>{likeCount > 0 && likeCount}
        </button>
        <button onClick={onComments} className="flex flex-col items-center text-[12px]">
          <span style={{ fontSize: 26 }}>💬</span>{post.commentCount > 0 && post.commentCount}
        </button>
        <Reshare post={post} />
      </div>
    </section>
  );
}

function Reshare({ post }: { post: FeedPost }) {
  const [count, setCount] = useState(post.reshareCount);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true);
    const res = await createPostAction({ resharedFromId: post.reshareOf?.id ?? post.id }).catch(() => null);
    setBusy(false);
    if (res?.ok) setCount((c) => c + 1);
  };
  return (
    <button onClick={go} disabled={busy} className="flex flex-col items-center text-[12px]">
      <span style={{ fontSize: 26 }}>🔁</span>{count > 0 && count}
    </button>
  );
}

function CommentsSheet({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { listCommentsAction(post.id).then(setComments).catch(() => setComments([])); }, [post.id]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const res = await addCommentAction(post.id, t);
    setBusy(false);
    if (res.ok && res.comment) { setComments((c) => [...(c ?? []), res.comment!]); setText(""); }
  };

  return (
    <div className="fixed inset-0 z-[95] flex flex-col justify-end" onClick={onClose}>
      <div className="flex-1" />
      <div className="rl-card rounded-b-none max-h-[70vh] flex flex-col" style={{ background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="font-medium text-sm">Comments</div>
          <button onClick={onClose} className="rl-btn text-xs">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto rl-scroll p-4 space-y-3">
          {comments === null ? (
            <div className="text-[13px]" style={{ color: "var(--ink-3)" }}>Loading…</div>
          ) : comments.length === 0 ? (
            <div className="text-[13px]" style={{ color: "var(--ink-3)" }}>No comments yet — be the first.</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium">{c.authorName}</span> <span className="whitespace-pre-wrap">{c.body}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 p-3 border-t" style={{ borderColor: "var(--line)" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Write a comment…" className="flex-1 rounded-full px-3 py-2 text-sm" style={{ background: "var(--paper-2)", border: "0.5px solid var(--line)" }} />
          <button onClick={send} disabled={busy || !text.trim()} className="rl-btn rl-btn-primary text-xs">Send</button>
        </div>
      </div>
    </div>
  );
}
