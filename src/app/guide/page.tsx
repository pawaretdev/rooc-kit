import type { Metadata } from "next";
import { GuideIndex } from "@/features/guide/GuideIndex";

export const metadata: Metadata = {
  title: "Guide — ROOC Kit",
  description: "Player guides for Ragnarok Origin Classic. Card upgrade requirements from Awaken to 3 stars.",
};

export default function GuidePage() {
  return <GuideIndex />;
}
