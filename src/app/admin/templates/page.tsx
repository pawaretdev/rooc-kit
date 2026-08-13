import type { Metadata } from "next";
import { TemplateAdmin } from "@/features/dailies/admin/TemplateAdmin";

export const metadata: Metadata = {
  title: "Task templates — Admin — ROOC Kit",
  robots: { index: false },
};

export default function AdminTemplatesPage() {
  return <TemplateAdmin />;
}
