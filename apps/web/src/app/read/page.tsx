"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StoryCard = {
  id: string;
  title: string;
  description: string | null;
  authorName: string;
};

export default function ReadPage() {
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stories", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          stories?: StoryCard[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Failed to load stories");
        setStories(data.stories ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load stories";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <main
      style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 12 }}
    >
      <h1 style={{ margin: 0 }}>Pick a story to read</h1>
      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: "var(--text-muted)" }}>{error}</div> : null}
      {!loading && !error && stories.length === 0 ? (
        <div style={{ color: "var(--text-muted)" }}>No stories available yet.</div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/read/${story.id}`}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-raised)",
              color: "var(--text-strong)",
              textDecoration: "none",
              display: "grid",
              gap: 4,
            }}
          >
            <div style={{ fontWeight: 700 }}>{story.title}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{story.authorName}</div>
            {story.description ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{story.description}</div>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
