"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [displayName, setDisplayName] = useState("Test");
  const [me, setMe] = useState<{ id: string; email: string; displayName: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enableServer) return;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => {
        // ignore
      });
  }, [enableServer]);

  const callAuth = async (path: string, body: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setMe(data.user ?? null);
      window.location.href = "/author";
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
    <main style={{ padding: 24, fontFamily: "var(--font-geist-sans)" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Choose Your Own Adventure</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Open the authoring tool to view and edit the story graph.
      </p>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          maxWidth: 520,
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Account</div>
        {!enableServer ? (
          <div style={{ opacity: 0.8 }}>
            Server sync is disabled (local-only mode). Set <code>NEXT_PUBLIC_ENABLE_SERVER</code> to &quot;true&quot; and
            configure Supabase env vars to enable login + cross-device saving.
          </div>
        ) : me ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ opacity: 0.8 }}>
              Signed in as <span style={{ fontWeight: 600 }}>{me.email}</span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => void logout()}
              disabled={busy}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "white",
                color: "#111827",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Password</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="8+ characters"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Display name (register only)</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => void callAuth("/api/auth/login", { email, password })}
                disabled={busy}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => void callAuth("/api/auth/register", { email, password, displayName })}
                disabled={busy}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                Register
              </button>
            </div>
          </div>
        )}
      </div>

      <Link
        href="/author"
        style={{
          display: "inline-block",
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "white",
          color: "#111827",
        }}
      >
        Go to Author
      </Link>

      <Link
        href="/read"
        style={{
          display: "inline-block",
          marginLeft: 10,
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "white",
          color: "#111827",
        }}
      >
        Go to Reader
      </Link>
    </main>
  );
}
