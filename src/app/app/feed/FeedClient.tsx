"use client";

import { useState, useRef } from "react";
import { createPostAction, listFeedAction, listStoriesAction, type FeedPost, type TrendingTag, type TrendingBook } from "@/app/actions/feed";
import { uploadFeedMedia } from "@/lib/media-client";
import { PostCard } from "./PostCard";
import { StoryTray } from "./Stories";
import { Trending } from "./Trending";
import { SwipeFeed } from "./SwipeFeed";

type Me = { id: number; name: string; handle: string; role: string };
type BookOpt = { id: number; title: string; author: string };

export function FeedClient({
  initial,
  me,
  myBooks,
  stories: initialStories,
  trendingTags,
  trendingBooks,
}: {
  initial: FeedPost[];
  me: Me;
  myBooks: BookOpt[];
  stories: FeedPost[];
  trendingTags: TrendingTag[];
  trendingBooks: TrendingBook[];
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initial);
  const [stories, setStories] = useState<FeedPost[]>(initialStories);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(initial.length < 20);
  const [swiping, setSwiping] = useState(false);

  const refresh = async () => {
    const fresh = await listFeedAction().catch(() => null);
    if (fresh) { setPosts(fresh); setDone(fresh.length < 20); }
  };
  const refreshStories = async () => {
    const s = await listStoriesAction().catch(() => null);
    if (s) setStories(s);
  };

  const loadMore = async () => {
    if (loadingMore || done) return;
    setLoadingMore(true);
    const last = posts[posts.length - 1];
    const more = await listFeedAction(last?.id).catch(() => []);
    setLoadingMore(false);
    if (more.length === 0) { setDone(true); return; }
    setPosts((p) => [...p, ...more]);
    if (more.length < 20) setDone(true);
  };

  const onDeleted = (id: number) => setPosts((p) => p.filter((x) => x.id !== id));

  return (
    <div className="space-y-4">
      <StoryTray stories={stories} meName={me.name} onPosted={refreshStories} />
      <Trending tags={trendingTags} books={trendingBooks} />

      <Composer me={me} myBooks={myBooks} onPosted={refresh} />

      {posts.length > 0 && (
        <button onClick={() => setSwiping(true)} className="rl-btn w-full text-sm" style={{ background: "var(--paper-2)" }}>
          ⤢ Swipe view — full-screen, scroll through the feed
        </button>
      )}

      {posts.length === 0 ? (
        <div className="rl-card p-8 text-center text-sm" style={{ color: "var(--ink-3)" }}>
          Nothing here yet. Share what you’re reading or learning to start the feed.
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} me={me} onReshared={refresh} onDeleted={onDeleted} />)
      )}

      {!done && posts.length > 0 && (
        <button onClick={loadMore} disabled={loadingMore} className="rl-btn w-full text-sm">
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}

      {swiping && <SwipeFeed posts={posts} onClose={() => setSwiping(false)} />}
    </div>
  );
}

function Composer({ me, myBooks, onPosted }: { me: Me; myBooks: BookOpt[]; onPosted: () => void }) {
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [bookId, setBookId] = useState<number | "">("");
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

  const submit = async () => {
    if (posting) return;
    if (!body.trim() && !media) { setError("Write something or add a photo / video."); return; }
    setPosting(true);
    setError(null);
    const res = await createPostAction({
      body: body.trim() || undefined,
      imageUrl: media?.kind === "image" ? media.url : undefined,
      videoUrl: media?.kind === "video" ? media.url : undefined,
      bookId: bookId === "" ? undefined : Number(bookId),
    });
    setPosting(false);
    if (res.ok) {
      setBody(""); setMedia(null); setBookId("");
      if (fileRef.current) fileRef.current.value = "";
      onPosted();
    } else {
      setError(res.error ?? "Could not post");
    }
  };

  return (
    <div className="rl-card p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={`What did you read or learn today, ${me.name.split(" ")[0]}? Use #tags…`}
        className="w-full rounded-md p-3 text-[15px] resize-y"
        style={{ background: "var(--paper-2)", border: "0.5px solid var(--line)" }}
      />

      {media && (
        <div className="relative mt-2 inline-block">
          {media.kind === "video" ? (
            <video src={media.url} controls playsInline className="rounded-lg max-h-56 bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt="" className="rounded-lg max-h-56" style={{ border: "0.5px solid var(--line)" }} />
          )}
          <button onClick={() => setMedia(null)} className="absolute top-1 right-1 rounded-full w-6 h-6 text-xs" style={{ background: "var(--paper)", border: "0.5px solid var(--line)" }}>✕</button>
        </div>
      )}

      {error && <div className="text-[12px] mt-2" style={{ color: "var(--danger)" }}>{error}</div>}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="rl-btn text-xs">
          {uploading ? "Uploading…" : "📷 Photo / Video"}
        </button>

        {myBooks.length > 0 && (
          <select value={bookId} onChange={(e) => setBookId(e.target.value === "" ? "" : Number(e.target.value))} className="rl-btn text-xs" style={{ background: "var(--paper-2)" }} title="Tag a book you read">
            <option value="">📖 Tag a book…</option>
            {myBooks.map((b) => (<option key={b.id} value={b.id}>{b.title}</option>))}
          </select>
        )}

        <button onClick={submit} disabled={posting || uploading} className="rl-btn rl-btn-primary text-sm ml-auto">
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
