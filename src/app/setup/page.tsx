import { AuthGate } from "@/components/AuthGate";
import { SetupEntry } from "@/features/monster-research/SetupEntry";

export const metadata = { title: "Data entry — ROOC Kit" };

export default function SetupPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <AuthGate>
        <SetupEntry />
      </AuthGate>
    </main>
  );
}
