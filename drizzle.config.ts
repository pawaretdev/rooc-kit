import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js loads .env.local for the app; drizzle-kit runs outside Next, so load it here.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Only needed by commands that touch the DB (migrate/studio) — generate works without it.
    url: process.env.DATABASE_URL ?? "",
  },
});
