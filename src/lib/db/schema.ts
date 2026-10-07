import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { DefenseHistoryEntry } from "@/features/defense/history";
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
  /**
   * Not part of the Auth.js contract — added for the admin user list (the
   * adapter never writes it, the default does). Rows that existed before the
   * column was added get the migration timestamp.
   */
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
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

/**
 * DEF Planner history — only for users who turned history sync on (it is
 * off by default, per device). One row per user holding every snapshot and
 * tombstone; unlike progress_snapshot the server MERGES each upload into the
 * stored list per record, so opting in on a second device never wipes the
 * history the first one saved.
 */
export const defenseHistories = pgTable("defense_history", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  entries: jsonb("entries").$type<DefenseHistoryEntry[]>().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Suggested Dailies tasks curated by the app owner (super admin, gated by
 * SUPER_ADMIN_EMAIL). Users adopt a template by copying it into their local
 * task list — rows here are suggestions, never live references.
 */
export const taskTemplates = pgTable("task_template", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  cadence: text("cadence").$type<"daily" | "weekly">().notNull(),
  /** rounds per period — >1 renders as a counter after adoption */
  targetCount: integer("target_count").notNull().default(1),
  /** optional special-event window (date or date-time, daily templates only) */
  eventStart: text("event_start"),
  eventEnd: text("event_end"),
  /**
   * Daily templates: id of a weekly template that caps this one. Adoption
   * copies the pair, so the user's local link points at their own task ids.
   * Self-referencing FKs would complicate deletes — the API validates it and
   * a dangling id is simply ignored at adoption time.
   */
  linkedTemplateId: text("linked_template_id"),
  /** in-game event art id from TASK_ICONS (src/lib/task-icons.ts); null = none */
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Gold Shop template categories — created first, then items bind to them
 * (mirrors the in-game shop's category tabs, e.g. Growth / Kafra Shop).
 */
export const goldShopCategories = pgTable("gold_shop_category", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Suggested Gold Shop items curated by the app owner — same copy-on-adopt
 * semantics as taskTemplates. Adoption resolves the category by NAME on the
 * client (matched case-insensitively against local categories, created when
 * missing) — the FK here only keeps the admin catalog consistent.
 */
export const goldShopTemplates = pgTable("gold_shop_template", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => goldShopCategories.id, { onDelete: "cascade" }),
  /** units offered per week; null = Unlimited */
  stock: integer("stock"),
  /** gold per unit */
  price: integer("price").notNull(),
  /** in-game art id from ITEM_ICONS (src/lib/item-icons.ts); null = generic tile */
  icon: text("icon"),
  /** rarity frame id from ITEM_FRAMES (src/lib/item-frames.ts); null = plain tile */
  frame: text("frame"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
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
