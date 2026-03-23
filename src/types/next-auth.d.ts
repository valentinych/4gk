import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      chgkId?: number | null;
      role: "PLAYER" | "MODERATOR" | "ORGANIZER" | "ADMIN";
    } & DefaultSession["user"];
  }
}
