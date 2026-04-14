"use client";

import { ArrowRight, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { GraphDocument } from "@cyoa/shared";

import AuthorShell from "@/features/graph/components/AuthorShell";

import styles from "./page.module.css";

type StoryCard = {
  id: string;
  title: string;
  description: string | null;
  authorName: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
};

export default function AuthorPage() {
  const router = useRouter();
  const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";

  const [me, setMe] = useState<{ id: string } | null>(null);
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyStoryId, setBusyStoryId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!enableServer) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = (await meRes.json().catch(() => ({}))) as { user?: { id: string } | null };
        if (!meRes.ok) throw new Error("Please log in first.");
        setMe(meData.user ?? null);

        if (!meData.user) {
          setStories([]);
          return;
        }

        const storiesRes = await fetch("/api/stories?scope=mine", { cache: "no-store" });
        const storiesData = (await storiesRes.json().catch(() => ({}))) as {
          stories?: StoryCard[];
          error?: string;
        } | null;
        if (!storiesRes.ok) throw new Error(storiesData?.error || "Failed to load stories");
        setStories(storiesData?.stories ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load stories";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [enableServer]);

  const startNewStory = async () => {
    setCreating(true);
    setError(null);
    try {
      const seedRes = await fetch("/seed/graph.cot.json", { cache: "no-store" });
      const seed = (await seedRes.json().catch(() => null)) as GraphDocument | null;
      if (!seedRes.ok || !seed || !seed.meta?.title) {
        throw new Error("Could not load starter story template");
      }

      const createRes = await fetch("/api/graph", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(seed),
      });
      const created = (await createRes.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!createRes.ok || !created.id) {
        throw new Error(created.error || "Could not create a new story");
      }

      router.push(`/author/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create a new story";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const openStory = (storyId: string) => {
    setBusyStoryId(storyId);
    router.push(`/author/${storyId}`);
  };

  if (!enableServer) {
    return <AuthorShell />;
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <Sparkles size={14} />
          Author workspace
        </div>
        <h1>What do you want to work on?</h1>
        <p>
          Pick one of your stories to continue editing, or start a new story from the seed graph.
        </p>
      </section>

      {!enableServer ? (
        <section className={styles.card}>
          <div className={styles.muted}>
            Server sync is disabled. Set <code>NEXT_PUBLIC_ENABLE_SERVER</code> to <code>true</code>{" "}
            to select stories.
          </div>
        </section>
      ) : !me ? (
        <section className={styles.card}>
          <div className={styles.muted}>
            You need to be signed in before you can choose a story.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href="/account" className={styles.buttonPrimary}>
              Go to account
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Start fresh</div>
            <div className={styles.inlineRow}>
              <div className={styles.muted}>
                Open a blank story seeded from the built-in starter graph.
              </div>
              <div className={styles.spacer} />
              <button
                type="button"
                onClick={() => void startNewStory()}
                className={styles.buttonPrimary}
                disabled={creating}
              >
                <Plus size={16} />
                {creating ? "Creating…" : "Create new story"}
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>Continue your stories</div>
            {loading ? <div className={styles.muted}>Loading stories…</div> : null}
            {error ? <div className={styles.muted}>{error}</div> : null}
            {!loading && !error && stories.length === 0 ? (
              <div className={styles.muted}>No stories found yet.</div>
            ) : null}
            <div className={styles.storyGrid}>
              {stories.map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => openStory(story.id)}
                  className={styles.storyCard}
                  disabled={busyStoryId === story.id}
                >
                  <div className={styles.storyCardHeader}>
                    <div className={styles.storyCardTitle}>{story.title}</div>
                    <div className={styles.storyMeta}>{story.authorName}</div>
                  </div>
                  {story.description ? (
                    <div className={styles.storyDescription}>{story.description}</div>
                  ) : (
                    <div className={styles.storyDescription}>No description provided.</div>
                  )}
                  <div className={styles.storyStats}>
                    <span>{story.nodeCount} nodes</span>
                    <span>{story.edgeCount} choices</span>
                    <span>{new Date(story.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.storyActionRow}>
                    <span>{busyStoryId === story.id ? "Opening…" : "Open story"}</span>
                    <ArrowRight size={15} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
