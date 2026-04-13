"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Provider } from "react-redux";

import type { GraphDocument } from "@cyoa/shared";

import { setGraph } from "@/features/graph/graphSlice";
import { makeStore, type AppStore } from "@/store/makeStore";

function getAuthorGraphIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/author\/([^/]+)$/);
  return match?.[1] ?? null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [store] = useState<AppStore>(() => makeStore());
  const authorGraphId = getAuthorGraphIdFromPathname(pathname);

  useEffect(() => {
    if (!authorGraphId) return;
    const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";
    if (!enableServer) return;

    let didCancel = false;
    let canSync = false;

    let pendingServerSync: ReturnType<typeof setTimeout> | null = null;
    let lastSyncedUpdatedAt: string | null = null;

    void (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = (await meRes.json().catch(() => ({}))) as { user?: { id: string } | null };
        if (!meRes.ok || !meData.user) return;

        const res = await fetch(`/api/graph/${authorGraphId}`, { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as { id: string; doc: GraphDocument };
        if (didCancel) return;

        store.dispatch(setGraph(data.doc));
        lastSyncedUpdatedAt = data.doc.meta.updatedAt;
        canSync = true;
      } catch {
        // ignore
      }
    })();

    const unsubscribe = store.subscribe(() => {
      if (!canSync) return;
      const state = store.getState();
      const doc = state.graph.doc;
      if (!doc) return;
      if (doc.meta.updatedAt === lastSyncedUpdatedAt) return;

      if (pendingServerSync) clearTimeout(pendingServerSync);
      pendingServerSync = setTimeout(() => {
        void fetch(`/api/graph/${authorGraphId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(doc),
        })
          .then((r) => {
            if (!r.ok) throw new Error("sync failed");
            lastSyncedUpdatedAt = doc.meta.updatedAt;
          })
          .catch(() => {
            // ignore
          });
      }, 1200);
    });

    return () => {
      didCancel = true;
      if (pendingServerSync) clearTimeout(pendingServerSync);
      unsubscribe();
    };
  }, [authorGraphId, store]);

  return <Provider store={store}>{children}</Provider>;
}
