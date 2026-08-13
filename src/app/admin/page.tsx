import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin — ROOC Kit",
  robots: { index: false },
};

/** Backoffice landing — jump to the first (currently only) tool. */
export default function AdminPage() {
  redirect("/admin/templates");
}
