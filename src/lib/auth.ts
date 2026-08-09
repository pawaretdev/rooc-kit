import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db/client";
import { accounts, sessions, users, verificationTokens } from "./db/schema";

/**
 * JWT session strategy on purpose: ordinary authenticated requests must not
 * open a DB connection (Railway Postgres has a low connection limit). The DB
 * is only touched on sign-in, when the adapter upserts the user/account.
 *
 * Provider credentials come from env by Auth.js convention:
 * AUTH_DISCORD_ID / AUTH_DISCORD_SECRET / AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers: [Discord, Google],
  callbacks: {
    session({ session, token }) {
      // token.sub is the user id from the adapter — expose it for sync queries.
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
