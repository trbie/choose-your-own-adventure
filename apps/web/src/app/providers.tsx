"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";

import type { GraphDocument } from "@cyoa/shared";

import {
  loadDraftGraph,
  loadServerGraphId,
  saveDraftGraph,
  saveServerGraphId,
} from "@/features/graph/graphPersistence";
import { setGraph } from "@/features/graph/graphSlice";
import { makeStore, type AppStore } from "@/store/makeStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState<AppStore>(() => makeStore());

  useEffect(() => {
    let didCancel = false;

    const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";

    let authedUserId: string | null = null;
    let serverGraphId: string | null = null;

    let pendingServerSync: ReturnType<typeof setTimeout> | null = null;
    let lastSyncedUpdatedAt: string | null = null;

    const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(url, { cache: "no-store", ...init });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return (await res.json()) as T;
    };

    const loadFromServerIfPossible = async (): Promise<GraphDocument | null> => {
      if (!enableServer) return null;
      try {
        const me = await fetchJson<{ user: { id: string } | null }>("/api/auth/me");
        authedUserId = me.user?.id ?? null;
        if (!authedUserId) return null;

        serverGraphId = loadServerGraphId();
        if (!serverGraphId) return null;

        const data = await fetchJson<{ id: string; doc: GraphDocument }>(`/api/graph/${serverGraphId}`);
        return data.doc;
      } catch {
        return null;
      }
    };

    const createServerGraphIfNeeded = async (doc: GraphDocument): Promise<void> => {
      if (!enableServer) return;
      if (!authedUserId) return;
      if (serverGraphId) return;

      try {
        const created = await fetchJson<{ id: string }>("/api/graph", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(doc),
        });

        serverGraphId = created.id;
        saveServerGraphId(created.id);
      } catch {
        // ignore
      }
    };

    const loadInitialDoc = async (): Promise<GraphDocument | null> => {
      const serverDoc = await loadFromServerIfPossible();
      if (serverDoc) return serverDoc;

      const draft = loadDraftGraph();
      if (draft) return draft;

      try {
        return await fetchJson<GraphDocument>("/seed/graph.cot.json");
      } catch {
        return null;
      }
    };

    void (async () => {
      const doc = await loadInitialDoc();
      if (didCancel || !doc) return;
      store.dispatch(setGraph(doc));

      // If logged in but no server graph yet, create one from the current doc.
      await createServerGraphIfNeeded(doc);
    })();

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const doc = state.graph.doc;
      if (!doc) return;

      saveDraftGraph(doc);

      // Debounced server sync when logged in and server graph id is known.
      if (!enableServer) return;
      if (!authedUserId || !serverGraphId) return;
      if (doc.meta.updatedAt === lastSyncedUpdatedAt) return;

      if (pendingServerSync) clearTimeout(pendingServerSync);
      pendingServerSync = setTimeout(() => {
        void fetch(`/api/graph/${serverGraphId}`, {
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
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
