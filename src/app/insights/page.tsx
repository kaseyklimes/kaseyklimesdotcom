import type { Metadata } from "next";
import { isOwner } from "@/lib/analytics/auth";
import { configured } from "@/lib/analytics/store";
import Login from "@/components/analytics/Login";
import Dashboard from "@/components/analytics/Dashboard";
import "./insights.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Private analytics",
  robots: { index: false, follow: false },
};
export default async function InsightsPage() {
  return (await isOwner()) ? (
    <Dashboard />
  ) : (
    <Login configured={configured()} />
  );
}
