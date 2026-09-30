"use client";
import Link from "next/link";
import { useState } from "react";
export default function Login({ configured }: { configured: boolean }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="insights login">
      <Link href="/">← Back to website</Link>
      <section>
        <span className="eyebrow">KASEY KLIMES / PRIVATE ANALYTICS</span>
        <h1>Analytics</h1>
        <p>
          Sign in to understand what brings people here—and what makes them
          stay.
        </p>
        {!configured ? (
          <p role="status">
            Analytics is awaiting secure configuration. The dashboard is locked.
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const password = new FormData(e.currentTarget).get("password");
              try {
                const r = await fetch("/api/analytics/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password }),
                });
                const data = await r.json();
                if (!r.ok) setError(data.error);
                else location.reload();
              } catch {
                setError("Unable to sign in. Please retry.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="password">Owner access key</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={16}
            />
            <button disabled={busy}>
              {busy ? "Signing in…" : "Open dashboard →"}
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        )}
        <small>Owner-only access · Session expires after 8 hours</small>
      </section>
    </main>
  );
}
