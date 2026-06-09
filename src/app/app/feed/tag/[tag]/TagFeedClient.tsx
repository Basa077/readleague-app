"use client";

import { useState } from "react";
import { listFeedByTagAction, type FeedPost } from "@/app/actions/feed";
import { PostCard } from "../../PostCard";

export function TagFeedClient({
  tag,
  initial,
  me,
}: {
  tag: string;
  initial: FeedPost[];
  me: { id: number; role: string };
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initial);
  const [done, setDone] = useState(initial.length < 20);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const f = await listFeedByTagAction(tag).catch(() => null);
    if (f) { setPosts(f); setDone(f.length < 20); }
  };
  const loadMore = async () => {
    if (loading || done) return;
    setLoading(true);
    const more = await listFeedByTagAction(tag, posts[posts.length - 1]?.id).catch(() => []);
    setLoading(false);
    if (more.length === 0) { setDone(true); return; }
    setPosts((p) => [...p, ...more]);
    if (more.length < 20) setDone(true);
  };
  const onDeleted = (id: number) => setPosts((p) => p.filter((x) => x.id !== id));

  if (posts.length === 0) {
    return (
      <div className="rl-card p-8 text-center text-sm" style={{ color: "var(--ink-3)" }}>
        No posts with <span className="rl-mono">#{tag}</span> yet. Be the first to start the conversation.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => <PostCard key={p.id} post={p} me={me} onReshared={refresh} onDeleted={onDeleted} />)}
      {!done && (
        <button onClick={loadMore} disabled={loading} className="rl-btn w-full text-sm">
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
