import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { Dailies } from "@/features/dailies/Dailies";

export const metadata: Metadata = {
  title: "Dailies — ROOC Kit",
  description:
    "Daily and weekly activity checklist per game account — never forget which ID did what.",
};

export default function DailiesPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <AuthGate>
        <Dailies />
      </AuthGate>
    </main>
  );
}
