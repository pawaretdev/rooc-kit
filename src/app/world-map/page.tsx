import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { WorldMapPage } from "@/features/world-map/WorldMapPage";

export const metadata: Metadata = {
  title: "World Map — ROOC Kit",
  description:
    "Browse every map in the game and see which monsters spawn where.",
};

export default function WorldMapRoute() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <AuthGate>
        <WorldMapPage />
      </AuthGate>
    </main>
  );
}
