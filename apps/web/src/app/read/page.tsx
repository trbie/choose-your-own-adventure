"use client";

import ReaderView from "@/features/reader/components/ReaderView";
import { useAppSelector } from "@/store/hooks";

export default function ReadPage() {
  const doc = useAppSelector((s) => s.graph.doc);

  if (!doc) return <div style={{ padding: 24 }}>Loading…</div>;

  return <ReaderView doc={doc} />;
}
