import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { ProgressExport } from "@/lib/progress-io";

/**
 * Auth.js standard tables (Drizzle adapter). Sessions use the JWT strategy so
 * the `session` table stays empty in practice, but the adapter still expects
 * the full set and it keeps a future switch to DB sessions painless.
 *
 * SQL identifiers are snake_case (Postgres convention — mixed case would need
 * quoting in every raw query); the TS property names stay camelCase because
 * that is what the Auth.js adapter reads.
 *
 * Schema changes ONLY via `pnpm db:generate` + committed migrations.
 */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

/**
 * Cloud copy of a user's progress — one snapshot per user, whole-document
 * replace on every sync (same ProgressExport JSON as the file backup, per the
 * one-shared-schema rule in AGENTS/README).
 */
export const progressSnapshots = pgTable("progress_snapshot", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<ProgressExport>().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);
