import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** DB user id — set in the session callback from token.sub */
      id: string;
      /** email matches SUPER_ADMIN_EMAIL — unlocks the /admin entry in the UI */
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }
}
