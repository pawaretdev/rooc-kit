import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { DefensePlanner } from "@/features/defense/DefensePlanner";

export const metadata: Metadata = {
  title: "DEF Planner — ROOC Kit",
  description:
    "Estimate how much your PDEF, MDEF, refine, PvP rating and damage reduction cut an opponent's damage in PvP — layer by layer — and track your build over time.",
};

export default function DefensePage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <AuthGate>
        <DefensePlanner />
      </AuthGate>
    </main>
  );
}
