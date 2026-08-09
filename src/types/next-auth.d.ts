import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** DB user id — set in the session callback from token.sub */
      id: string;
    } & DefaultSession["user"];
  }
}
