import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Thai, Poppins } from "next/font/google";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { Providers } from "./providers";
import "./globals.css";

// Poppins is not a variable font — list every weight the UI uses
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: "ROOC Kit",
  description:
    "Companion planner for Ragnarok Origin Classic — Monster Research tracker and market restock alerts.",
};

const DIRECTION_CONTRACT = `<!--
THESIS: the tracker answers "where do I farm tonight" in one glance; entering data and reading the plan are the same screen, not two.
OWN-WORLD: "Night Ops" - a dark gamer-tool console (cool graphite blue, hue ~255), one blaze-orange accent for decisions/active states, gold for levels, red reserved for blockers; thin 1px lines, small radii, mono tabular numbers; Poppins + Noto Sans Thai. Dark-first (a second-screen tool beside the game at night); light theme is an explicit opt-in with the full token set redefined.
STORY: the game Bestiary's skeleton on a console skin - element sidebar on the left, rows of monster sprite tiles, click a tile and the editor unfolds under the row.
FIRST VIEWPORT: tagline + mode pills, element sidebar with progress counts, then the #1 priority row card: gold Lv badge, tiles with corner levels, blocker tiles ringed red, best-trip footer.
FORM: established world (user picked direction A "Night Ops" from 4 rendered proposals, accent swapped to direction D's orange; structure - sidebar/tiles/tooltips/inline editor - locked from the approved artifact).
FINISH: unreviewed and undocumented is unfinished; this build ends with lint+build green and DESIGN.md rewritten.
-->`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} ${notoThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {/* apply the stored theme before first paint — dark stays the default */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("rooc.theme")==="light")document.documentElement.classList.add("light")}catch(e){}`,
          }}
        />
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        <Providers>
          <AppHeader />
          {children}
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}
