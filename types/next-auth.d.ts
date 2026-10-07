import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "ADMIN" | "CLIENT"; timezone: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "CLIENT";
    timezone?: string;
  }
}
