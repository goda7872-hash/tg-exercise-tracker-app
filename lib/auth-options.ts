import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Lets an invited client (pre-created by email) sign in with Google. Google verifies emails.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: { isActive: true },
      });
      return !existing || existing.isActive;
    },
    async jwt({ token, user }) {
      // `user` is only present at sign-in. Role changes apply after the next login.
      if (user) {
        let db = await prisma.user.findUnique({ where: { id: user.id } });
        if (db && db.role !== "ADMIN" && adminEmails().includes(db.email.toLowerCase())) {
          db = await prisma.user.update({ where: { id: db.id }, data: { role: "ADMIN" } });
        }
        token.sub = user.id;
        token.role = db?.role ?? "CLIENT";
        token.timezone = db?.timezone ?? "UTC";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role ?? "CLIENT";
        session.user.timezone = token.timezone ?? "UTC";
      }
      return session;
    },
  },
};
