"use client";

import { BadgeCheck, LogIn, LogOut, UserPlus, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./page.module.css";

type MeUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export default function AccountPage() {
  const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";

  const [me, setMe] = useState<MeUser | null>(null);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [displayName, setDisplayName] = useState("Test");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enableServer) return;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => {
        // ignore
      });
  }, [enableServer]);

  const callAuth = async (path: "/api/auth/login" | "/api/auth/register", body: unknown) => {
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
    setError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      setMe(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.pill}>
          <BadgeCheck size={13} />
          API-backed account
        </div>
        <h1>Account</h1>
        <p>
          This page only includes features implemented in the current API: session lookup, login,
          register, and logout.
        </p>
      </section>

      <section className={styles.card}>
        <h2>
          <WalletCards size={17} />
          Session
        </h2>
        {!enableServer ? (
          <p className={styles.muted}>
            Server sync is disabled. Set <code>NEXT_PUBLIC_ENABLE_SERVER</code> to <code>true</code>{" "}
            to use account endpoints.
          </p>
        ) : me ? (
          <div className={styles.stack}>
            <div className={styles.row}>
              <span className={styles.label}>Email</span>
              <span>{me.email}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Display name</span>
              <span>{me.displayName || "(none)"}</span>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={busy}
              className={styles.button}
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        ) : (
          <div className={styles.stack}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className={styles.input}
                placeholder="8+ characters"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Display name (register)</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={styles.input}
                placeholder="Optional"
              />
            </label>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => void callAuth("/api/auth/login", { email, password })}
                disabled={busy}
                className={styles.button}
              >
                <LogIn size={15} />
                Login
              </button>
              <button
                type="button"
                onClick={() =>
                  void callAuth("/api/auth/register", { email, password, displayName })
                }
                disabled={busy}
                className={styles.button}
              >
                <UserPlus size={15} />
                Register
              </button>
            </div>
          </div>
        )}

        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}
