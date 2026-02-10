import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { secondMeProvider, authConfig } from "./auth-options";

export const authOptions: NextAuthConfig = {
  providers: [secondMeProvider],
  ...authConfig,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
