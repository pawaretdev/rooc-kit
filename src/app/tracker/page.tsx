import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { MonsterResearch } from "@/features/monster-research/MonsterResearch";

export const metadata: Metadata = {
  title: "Monster Research — ROOC Kit",
  description:
    "Track your Monster Research levels and see where to farm tonight.",
};

export default function TrackerPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <AuthGate>
        <MonsterResearch />
      </AuthGate>
    </main>
  );
}
