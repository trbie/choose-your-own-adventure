"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { GraphDocument } from "@cyoa/shared";

import ReaderView from "@/features/reader/components/ReaderView";

export default function ReadStoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const storyId = params.id;

  const [doc, setDoc] = useState<GraphDocument | null>(null);
  const [title, setTitle] = useState<string>("Story");
  const [authorName, setAuthorName] = useState<string>("Unknown author");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stories/${storyId}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          doc?: GraphDocument;
          owner?: { displayName: string | null; email: string };
          error?: string;
        } | null;

        if (!res.ok) throw new Error(data?.error || "Failed to load story");
        if (cancelled) return;

        setDoc(data?.doc ?? null);
        setTitle(data?.doc?.meta.title ?? "Story");
        setAuthorName(data?.owner?.displayName?.trim() || data?.owner?.email || "Unknown author");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load story";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadStory();

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>{error}</div>
        <button type="button" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  if (!doc) {
    return <div style={{ padding: 24 }}>Story not found.</div>;
  }

  return (
    <main style={{ minHeight: "100%" }}>
      <div style={{ padding: "20px 24px 0", color: "var(--text-muted)" }}>
        <div style={{ fontSize: 13, marginBottom: 6 }}>{authorName}</div>
        <h1 style={{ fontSize: 28, lineHeight: 1.1, margin: 0 }}>{title}</h1>
      </div>
      <ReaderView doc={doc} />
    </main>
  );
}