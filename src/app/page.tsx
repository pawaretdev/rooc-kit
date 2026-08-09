import type { Metadata } from "next";
import { Landing } from "@/features/landing/Landing";

export const metadata: Metadata = {
  title: "ROOC Kit — Monster Research planner for Ragnarok Origin Classic",
  description:
    "Track Monster Research, see which monsters block each row, and get one recommended map trip. Free, local-first, no account needed.",
};

export default function Home() {
  return <Landing />;
}
