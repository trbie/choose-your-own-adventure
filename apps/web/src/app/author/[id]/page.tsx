"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import AuthorShell from "@/features/graph/components/AuthorShell";

export default function AuthorStoryPage() {
  const params = useParams<{ id: string }>();
  const storyId = params.id;
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const validateAccess = async () => {
      setLoading(true);
      setAccessError(null);
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = (await meRes.json().catch(() => ({}))) as { user?: { id: string } | null };
        if (!meRes.ok || !meData.user) {
          throw new Error("Please sign in to edit stories.");
        }

        const graphRes = await fetch(`/api/graph/${storyId}`, { cache: "no-store" });
        if (graphRes.status === 404) {
          throw new Error("You do not have access to edit this story.");
        }
        if (!graphRes.ok) {
          throw new Error("Could not open this story for editing.");
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not open this story for editing.";
        setAccessError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void validateAccess();
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  if (loading) {
    return <div style={{ padding: 24 }}>Checking story access…</div>;
  }

  if (accessError) {
    return (
      <main
        style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 12 }}
      >
        <h1 style={{ margin: 0 }}>Cannot open story</h1>
        <div style={{ color: "var(--text-muted)" }}>{accessError}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/author" style={{ textDecoration: "underline" }}>
            Back to your stories
          </Link>
          <Link href="/account" style={{ textDecoration: "underline" }}>
            Open account
          </Link>
        </div>
      </main>
    );
  }

  return <AuthorShell />;
}
