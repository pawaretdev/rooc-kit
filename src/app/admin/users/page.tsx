import type { Metadata } from "next";
import { UserAdmin } from "@/features/admin/UserAdmin";

export const metadata: Metadata = {
  title: "Users — Admin — ROOC Kit",
  robots: { index: false },
};

export default function AdminUsersPage() {
  return <UserAdmin />;
}
