"use client";

import { BookOpenText, PenSquare, ShieldCheck, Sparkles, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./page.module.css";

export default function Home() {
  const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [me, setMe] = useState<{ id: string; email: string; displayName: string | null } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<
    Array<{
      id: string;
      title: string;
      description: string | null;
      authorName: string;
      updatedAt: string;
      nodeCount: number;
      edgeCount: number;
    }>
  >([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);

  useEffect(() => {
    if (!enableServer) return;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => {
        // ignore
      });
  }, [enableServer]);

  useEffect(() => {
    if (!enableServer || !me) {
      setStories([]);
      setStoriesError(null);
      return;
    }

    const loadStories = async () => {
      setStoriesLoading(true);
      setStoriesError(null);
      try {
        const res = await fetch("/api/stories", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          stories?: Array<{
            id: string;
            title: string;
            description: string | null;
            authorName: string;
            updatedAt: string;
            nodeCount: number;
            edgeCount: number;
          }>;
          error?: string;
        } | null;

        if (!res.ok) throw new Error(data?.error || "Failed to load stories");
        setStories(data?.stories ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load stories";
        setStoriesError(message);
      } finally {
        setStoriesLoading(false);
      }
    };

    void loadStories();
  }, [enableServer, me]);

  const callAuth = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setMe(data.user ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMe(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <Sparkles size={14} />
          Storycraft Workspace
        </div>
        <h1>Choose Your Own Adventure</h1>
        <p>
          Build branching stories in Author mode, test the flow in Reader mode, and keep your graph
          easy to navigate as it grows.
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>
          <ShieldCheck size={16} />
          Account
        </div>
        {!enableServer ? (
          <div className={styles.muted}>
            Sign in to save your stories and keep them available on other devices.
          </div>
        ) : me ? (
          <div className={styles.inlineRow}>
            <div className={styles.muted}>
              Signed in as <span className={styles.strong}>{me.email}</span>
            </div>
            <div className={styles.spacer} />
            <button
              type="button"
              onClick={() => void logout()}
              disabled={busy}
              className={styles.buttonSecondary}
            >
              Logout
            </button>
          </div>
        ) : (
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <div className={styles.fieldLabel}>Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="off"
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <div className={styles.fieldLabel}>Password</div>
              <div className={styles.passwordRow}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="8+ characters"
                  autoComplete="new-password"
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className={styles.passwordToggle}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <label className={styles.field}>
              <div className={styles.fieldLabel}>Display name (register only)</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional"
                autoComplete="off"
                className={styles.input}
              />
            </label>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => void callAuth("/api/auth/login", { email, password })}
                disabled={busy}
                className={styles.buttonPrimary}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() =>
                  void callAuth("/api/auth/register", { email, password, displayName })
                }
                disabled={busy}
                className={styles.buttonSecondary}
              >
                Register
              </button>
            </div>
          </div>
        )}
        {error ? <div className={styles.muted}>{error}</div> : null}
      </section>

      {enableServer && me ? (
        <section className={styles.card}>
          <div className={styles.cardTitle}>Browse stories</div>
          <div className={styles.muted} style={{ marginBottom: 12 }}>
            Jump into stories created by other authors on this workspace.
          </div>
          {storiesLoading ? <div className={styles.muted}>Loading stories…</div> : null}
          {storiesError ? <div className={styles.muted}>{storiesError}</div> : null}
          {!storiesLoading && !storiesError && stories.length === 0 ? (
            <div className={styles.muted}>No stories yet.</div>
          ) : null}
          {stories.length > 0 ? (
            <div className={styles.storyGrid}>
              {stories.map((story) => (
                <Link key={story.id} href={`/read/${story.id}`} className={styles.storyCard}>
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
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={styles.actionsPanel}>
        <Link href="/author" className={styles.buttonPrimary}>
          <PenSquare size={16} />
          Open Author
        </Link>
        <Link href="/read" className={styles.buttonSecondary}>
          <BookOpenText size={16} />
          Open Reader
        </Link>
        <Link href="/account" className={styles.buttonSecondary}>
          <UserCircle2 size={16} />
          Account
        </Link>
      </section>
    </main>
  );
}
