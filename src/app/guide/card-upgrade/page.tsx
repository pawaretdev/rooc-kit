import type { Metadata } from "next";
import { CardUpgradeGuide } from "@/features/guide/CardUpgradeGuide";

export const metadata: Metadata = {
  title: "Card Upgrade Guide — ROOC Kit",
  description: "Compare fragments and base cards for all seven card grades, from Awaken through level 15 and 3 stars.",
};

export default function CardUpgradePage() {
  return <CardUpgradeGuide />;
}
