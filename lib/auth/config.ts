import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Stratégie de session JWT (pas de session base de données) — plus simple,
// et compatible Edge Runtime pour middleware.ts (Partie 6 du brief).
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/connexion"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      if (token.email && session.user) session.user.email = token.email as string;
      return session;
    }
  }
};
