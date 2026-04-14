"use client";

import { LogIn, LogOut, UserPlus, WalletCards } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <h1>Account</h1>
        <p>Sign in, create an account, or log out from this workspace.</p>
      </section>

      <section className={styles.card}>
        <h2>
          <WalletCards size={17} />
          Session
        </h2>
        {!enableServer ? (
          <p className={styles.muted}>Sign in to access your account.</p>
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
                autoComplete="off"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <div className={styles.passwordRow}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  placeholder="8+ characters"
                  autoComplete="new-password"
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
              <span className={styles.label}>Display name (register)</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={styles.input}
                placeholder="Optional"
                autoComplete="off"
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
