"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Provider } from "react-redux";

import type { GraphDocument } from "@cyoa/shared";

import { setAuthUser, type AuthUser } from "@/features/auth/authSlice";
import { loadDraftGraph, saveDraftGraph } from "@/features/graph/graphPersistence";
import { setGraph } from "@/features/graph/graphSlice";
import { loadPrefs, savePrefs } from "@/features/prefs/prefsPersistence";
import { hydratePrefs, setLastOpenedGraphId } from "@/features/prefs/prefsSlice";
import { makeStore, type AppStore } from "@/store/makeStore";

function getAuthorGraphIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/author\/([^/]+)$/);
  return match?.[1] ?? null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [store] = useState<AppStore>(() => makeStore());
  const authorGraphId = getAuthorGraphIdFromPathname(pathname);
  const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";

  useEffect(() => {
    const loadedPrefs = loadPrefs();
    if (loadedPrefs) {
      store.dispatch(hydratePrefs(loadedPrefs));
    }

    let pendingDraftSave: ReturnType<typeof setTimeout> | null = null;
    let pendingPrefsSave: ReturnType<typeof setTimeout> | null = null;
    let lastDraftUpdatedAt: string | null = store.getState().graph.doc?.meta.updatedAt ?? null;
    let lastSavedPrefs = JSON.stringify(store.getState().prefs);

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();

      const doc = state.graph.doc;
      if (doc && doc.meta.updatedAt !== lastDraftUpdatedAt) {
        if (pendingDraftSave) clearTimeout(pendingDraftSave);
        pendingDraftSave = setTimeout(() => {
          saveDraftGraph(doc);
          lastDraftUpdatedAt = doc.meta.updatedAt;
        }, 700);
      }

      const prefsJson = JSON.stringify(state.prefs);
      if (prefsJson !== lastSavedPrefs) {
        if (pendingPrefsSave) clearTimeout(pendingPrefsSave);
        pendingPrefsSave = setTimeout(() => {
          savePrefs(state.prefs);
          lastSavedPrefs = prefsJson;
        }, 220);
      }
    });

    return () => {
      if (pendingDraftSave) clearTimeout(pendingDraftSave);
      if (pendingPrefsSave) clearTimeout(pendingPrefsSave);
      unsubscribe();
    };
  }, [store]);

  useEffect(() => {
    if (!authorGraphId) return;

    store.dispatch(setLastOpenedGraphId(authorGraphId));

    const doc = store.getState().graph.doc;
    if (doc) return;

    const draft = loadDraftGraph();
    if (draft) {
      store.dispatch(setGraph(draft));
    }
  }, [authorGraphId, store]);

  useEffect(() => {
    if (enableServer) return;
    if (!pathname.startsWith("/author")) return;

    const existing = store.getState().graph.doc;
    if (existing) return;

    const draft = loadDraftGraph();
    if (draft) {
      store.dispatch(setGraph(draft));
      return;
    }

    let didCancel = false;

    void (async () => {
      try {
        const seedRes = await fetch("/seed/graph.cot.json", { cache: "no-store" });
        const seed = (await seedRes.json().catch(() => null)) as GraphDocument | null;
        if (didCancel) return;
        if (!seedRes.ok || !seed) return;
        store.dispatch(setGraph(seed));
      } catch {
        // ignore
      }
    })();

    return () => {
      didCancel = true;
    };
  }, [enableServer, pathname, store]);

  useEffect(() => {
    if (!enableServer) {
      store.dispatch(setAuthUser(null));
      return;
    }

    let didCancel = false;

    void (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = (await meRes.json().catch(() => ({}))) as { user?: AuthUser | null };
        if (didCancel) return;
        store.dispatch(setAuthUser(meRes.ok ? (meData.user ?? null) : null));
      } catch {
        if (!didCancel) store.dispatch(setAuthUser(null));
      }
    })();

    return () => {
      didCancel = true;
    };
  }, [enableServer, pathname, store]);

  useEffect(() => {
    if (!authorGraphId) return;
    if (!enableServer) return;

    let didCancel = false;
    let canSync = false;

    let pendingServerSync: ReturnType<typeof setTimeout> | null = null;
    let lastSyncedUpdatedAt: string | null = null;

    void (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = (await meRes.json().catch(() => ({}))) as { user?: AuthUser | null };
        store.dispatch(setAuthUser(meRes.ok ? (meData.user ?? null) : null));
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
  }, [authorGraphId, enableServer, store]);

  return <Provider store={store}>{children}</Provider>;
}
