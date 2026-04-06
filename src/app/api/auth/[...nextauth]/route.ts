import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Facebook from "next-auth/providers/facebook";
import Instagram from "next-auth/providers/instagram";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Google,
    GitHub,
    Facebook,
    Instagram,
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account?.provider) return false;

      const email = user.email ?? `${account.provider}-${account.providerAccountId}@oauth.flashmind.app`;
      const nome = user.name ?? account.provider;

      // Upsert user: find by email or create
      let existingUser = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!existingUser) {
        const randomPw = await hash(Math.random().toString(36), 10);
        existingUser = await prisma.usuario.create({
          data: {
            nome,
            email,
            senhaHash: randomPw,
          },
        });
      }

      // Set our session cookie so our own middleware and `requireUserId()` work
      const token = await createSessionToken(existingUser.id);
      await setSessionCookie(token);

      return true;
    },
    async redirect({ baseUrl }) {
      return baseUrl;
    },
  },
});
