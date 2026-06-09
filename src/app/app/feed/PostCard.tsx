"use client";

import { useState } from "react";
import Link from "next/link";
import {
  toggleLikeAction,
  addCommentAction,
  listCommentsAction,
  createPostAction,
  reportPostAction,
  deletePostAction,
  type FeedPost,
  type CommentDTO,
} from "@/app/actions/feed";
import { RichText, PostMedia } from "./RichText";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "R";
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 rl-serif" style={{ width: size, height: size, background: "var(--accent-soft)", color: "var(--accent-ink)", fontSize: size * 0.38 }}>
      {initials(name)}
    </div>
  );
}

function BookChip({ book }: { book: NonNullable<FeedPost["book"]> }) {
  return (
    <Link href={`/app/books/${book.id}`} className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[12px]" style={{ background: "var(--paper-3)", color: "var(--ink-2)" }}>
      📖 <span className="font-medium">{book.title}</span>
      <span style={{ color: "var(--ink-3)" }}>· {book.author}</span>
    </Link>
  );
}

function PostBody({ post, embedded = false }: { post: FeedPost; embedded?: boolean }) {
  return (
    <div className={embedded ? "rl-card p-3 mt-2" : ""} style={embedded ? { background: "var(--paper-3)" } : undefined}>
      {embedded && (
        <div className="flex items-center gap-2 mb-1">
          <Avatar name={post.author.name} size={24} />
          <span className="text-[13px] font-medium">{post.author.name}</span>
          <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>· {timeAgo(post.createdAt)}</span>
        </div>
      )}
      {post.body && <p className="text-[15px] leading-relaxed whitespace-pre-wrap"><RichText text={post.body} /></p>}
      {(post.imageUrl || post.videoUrl) && (
        <div className="mt-2">
          <PostMedia imageUrl={post.imageUrl} videoUrl={post.videoUrl} />
        </div>
      )}
      {post.book && <BookChip book={post.book} />}
    </div>
  );
}

export function PostCard({
  post: initial,
  me,
  onReshared,
  onDeleted,
}: {
  post: FeedPost;
  me: { id: number; role: string };
  onReshared: () => void;
  onDeleted: (id: number) => void;
}) {
  const [post, setPost] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [reshareOpen, setReshareOpen] = useState(false);
  const [reshareText, setReshareText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const like = async () => {
    // optimistic
    setPost((p) => ({ ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }));
    const res = await toggleLikeAction(post.id).catch(() => null);
    if (res) setPost((p) => ({ ...p, likedByMe: res.liked, likeCount: res.count }));
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) setComments(await listCommentsAction(post.id).catch(() => []));
  };

  const sendComment = async () => {
    const text = commentText.trim();
    if (!text || busy) return;
    setBusy(true);
    const res = await addCommentAction(post.id, text);
    setBusy(false);
    if (res.ok && res.comment) {
      setComments((c) => [...(c ?? []), res.comment!]);
      setCommentText("");
      setPost((p) => ({ ...p, commentCount: p.commentCount + 1 }));
    }
  };

  const doReshare = async () => {
    if (busy) return;
    setBusy(true);
    const res = await createPostAction({ resharedFromId: post.reshareOf?.id ?? post.id, body: reshareText.trim() || undefined });
    setBusy(false);
    if (res.ok) {
      setReshareOpen(false);
      setReshareText("");
      setPost((p) => ({ ...p, reshareCount: p.reshareCount + 1 }));
      onReshared();
    }
  };

  const report = async () => {
    setMenuOpen(false);
    await reportPostAction(post.id).catch(() => {});
    alert("Thanks — this post has been reported for review.");
  };

  const remove = async () => {
    setMenuOpen(false);
    if (!confirm("Delete this post?")) return;
    onDeleted(post.id);
    await deletePostAction(post.id).catch(() => {});
  };

  const canDelete = post.mine || me.role === "coordinator";

  return (
    <article className="rl-card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={post.author.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[15px] truncate">{post.author.name}</span>
            <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>@{post.author.handle}</span>
            {post.author.leagueId && <span className="rl-pill text-[10px]">{post.author.leagueId}</span>}
            <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>· {timeAgo(post.createdAt)}</span>
            <div className="ml-auto relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="px-2 text-[var(--ink-3)]" aria-label="More">⋯</button>
              {menuOpen && (
                <div className="absolute right-0 top-6 z-20 rl-card py-1 text-sm shadow-lg" style={{ background: "var(--paper-2)", minWidth: 140 }}>
                  <button onClick={report} className="block w-full text-left px-3 py-1.5 hover:bg-[var(--paper-3)]">Report</button>
                  {canDelete && <button onClick={remove} className="block w-full text-left px-3 py-1.5 hover:bg-[var(--paper-3)]" style={{ color: "var(--danger)" }}>Delete</button>}
                </div>
              )}
            </div>
          </div>

          {post.reshareOf && <div className="text-[12px] mt-0.5" style={{ color: "var(--ink-3)" }}>🔁 reshared</div>}

          <PostBody post={post} />
          {post.reshareOf && <PostBody post={post.reshareOf} embedded />}

          {/* Action row */}
          <div className="flex items-center gap-5 mt-3 text-[13px]" style={{ color: "var(--ink-2)" }}>
            <button onClick={like} aria-label="Like" aria-pressed={post.likedByMe} className="flex items-center gap-1.5 transition" style={{ color: post.likedByMe ? "var(--danger)" : "var(--ink-2)" }}>
              <span>{post.likedByMe ? "❤️" : "🤍"}</span> {post.likeCount > 0 && post.likeCount}
            </button>
            <button onClick={toggleComments} aria-label="Comments" className="flex items-center gap-1.5">💬 {post.commentCount > 0 && post.commentCount}</button>
            <button onClick={() => setReshareOpen((o) => !o)} aria-label="Reshare" className="flex items-center gap-1.5">🔁 {post.reshareCount > 0 && post.reshareCount}</button>
          </div>

          {reshareOpen && (
            <div className="mt-3 rl-card p-3" style={{ background: "var(--paper-3)" }}>
              <textarea value={reshareText} onChange={(e) => setReshareText(e.target.value)} rows={2} placeholder="Add a thought (optional)…" className="w-full rounded-md p-2 text-sm" style={{ background: "var(--paper)", border: "0.5px solid var(--line)" }} />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setReshareOpen(false)} className="rl-btn text-xs">Cancel</button>
                <button onClick={doReshare} disabled={busy} className="rl-btn rl-btn-primary text-xs">Reshare now</button>
              </div>
            </div>
          )}

          {showComments && (
            <div className="mt-3 space-y-2">
              {comments === null ? (
                <div className="text-[13px]" style={{ color: "var(--ink-3)" }}>Loading…</div>
              ) : comments.length === 0 ? (
                <div className="text-[13px]" style={{ color: "var(--ink-3)" }}>No comments yet — be the first.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar name={c.authorName} size={26} />
                    <div className="rl-card px-3 py-1.5 flex-1" style={{ background: "var(--paper-3)" }}>
                      <div className="text-[12px]"><span className="font-medium">{c.authorName}</span> <span style={{ color: "var(--ink-3)" }}>· {timeAgo(c.createdAt)}</span></div>
                      <div className="text-[14px] whitespace-pre-wrap">{c.body}</div>
                    </div>
                  </div>
                ))
              )}
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  placeholder="Write a comment…"
                  className="flex-1 rounded-full px-3 py-1.5 text-sm"
                  style={{ background: "var(--paper-2)", border: "0.5px solid var(--line)" }}
                />
                <button onClick={sendComment} disabled={busy || !commentText.trim()} className="rl-btn rl-btn-primary text-xs">Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
