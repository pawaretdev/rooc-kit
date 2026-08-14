import type { Metadata } from "next";
import { ShopTemplateAdmin } from "@/features/shop-planner/admin/ShopTemplateAdmin";

export const metadata: Metadata = {
  title: "Shop templates — Admin — ROOC Kit",
  robots: { index: false },
};

export default function AdminShopTemplatesPage() {
  return <ShopTemplateAdmin />;
}
