import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { ShopPlanner } from "@/features/shop-planner/ShopPlanner";

export const metadata: Metadata = {
  title: "Shop Planner — ROOC Kit",
  description:
    "Plan your weekly Gold Shop purchases per game account — what to buy, what it costs, and whether your gold covers it.",
};

export default function ShopPlannerPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <AuthGate>
        <ShopPlanner />
      </AuthGate>
    </main>
  );
}
