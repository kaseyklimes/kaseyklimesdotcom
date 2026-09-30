"use client";
import { useState, useEffect } from "react";
export default function PrivacyControl() {
  const [out, setOut] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      setOut(localStorage.getItem("analytics-opt-out") === "1");
    } catch {
      setError("Browser storage is unavailable; analytics is disabled.");
    }
  }, []);
  return (
    <section className="mt-8 p-5 border rounded">
      <p>
        {out === null
          ? "Checking browser preference…"
          : out
            ? "You have opted out of analytics in this browser."
            : "Analytics is allowed unless your browser sends a privacy signal."}
      </p>
      <button
        className="mt-4 border rounded px-4 py-3"
        disabled={out === null}
        onClick={() => {
          try {
            localStorage.setItem("analytics-opt-out", out ? "0" : "1");
            sessionStorage.removeItem("site-analytics-session");
            setOut(!out);
          } catch {
            setError("Unable to save your preference.");
          }
        }}
      >
        {out ? "Allow analytics" : "Opt out of analytics"}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
