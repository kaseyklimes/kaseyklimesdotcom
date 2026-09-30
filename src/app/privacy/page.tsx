import Link from "next/link";
import type { Metadata } from "next";
import PrivacyControl from "@/components/analytics/PrivacyControl";
export const metadata: Metadata = { title: "Privacy" };
export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 leading-relaxed">
      <Link href="/" className="underline">
        ← Home
      </Link>
      <h1 className="text-3xl mt-12 mb-6">Website analytics & privacy</h1>
      <p>
        This website uses first-party analytics to understand which content
        people find useful. It records pages viewed, visible content cards, link
        clicks, gallery and media interactions, approximate active reading time,
        and scroll depth. Card exposures also retain the content and thumbnail
        version, star rating, grid position, card size, active grid filter, and
        rounded viewport dimensions. A short-lived identifier in tab session
        storage connects a card click to its destination page and measured
        attention; it is consumed on the next page and expires after two
        minutes.
      </p>
      <p className="mt-5">
        Visits are grouped by a random identifier in session storage, scoped to
        your browser tab. A new session begins after 30 minutes without a new
        page view. Analytics includes referring domains, campaign tags, device
        type, and approximate country. It does not record your name, email
        address, form inputs, precise location, or full referring URLs. Outbound
        links are reduced to destination domains. IP addresses are not stored in
        analytics events; a temporary cryptographic hash is used for abuse
        prevention.
      </p>
      <p className="mt-5">
        Analytics is accessible only to the website owner. Per-view summaries
        are retained for long-term and all-time history. Repeated events are
        compacted into summaries; no raw event replay is retained. Hosting and
        analytics storage providers process requests to operate this service.
        Browser Do Not Track and Global Privacy Control signals are honored. You
        can also opt out below; your choice is saved only in this browser.
      </p>
      <PrivacyControl />
    </main>
  );
}
