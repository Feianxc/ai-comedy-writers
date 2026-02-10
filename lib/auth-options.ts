import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { SecondMeProfile, SecondMeUserResponse } from "@/types/auth";

const SECOND_ME_CLIENT_ID = process.env.SECOND_ME_CLIENT_ID;
const SECOND_ME_CLIENT_SECRET = process.env.SECOND_ME_CLIENT_SECRET;

if (!SECOND_ME_CLIENT_ID || !SECOND_ME_CLIENT_SECRET) {
  throw new Error(
    "Missing SECOND_ME_CLIENT_ID or SECOND_ME_CLIENT_SECRET environment variables"
  );
}

export const secondMeProvider = {
  id: "secondme",
  name: "Second Me",
  type: "oauth" as const,
  authorization: {
    url: "https://api.second.me/oauth/authorize",
    params: {
      scope: "user:read",
      response_type: "code",
    },
  },
  token: "https://api.second.me/oauth/token",
  userinfo: "https://api.second.me/v1/user",
  clientId: SECOND_ME_CLIENT_ID,
  clientSecret: SECOND_ME_CLIENT_SECRET,
  profile(data: SecondMeUserResponse): SecondMeProfile {
    return {
      id: data.id,
      displayName: data.display_name,
      bio: data.bio,
      image: data.avatar,
      interests: data.interests,
    };
  },
  checks: ["state"] as ("state" | "none" | "pkce")[],
};

export const authConfig: Omit<NextAuthConfig, "providers"> = {
  callbacks: {
    async jwt({ token, account, user }): Promise<JWT> {
      // 首次登录时保存token信息
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: (account.expires_at ?? 0) * 1000,
          user: {
            id: user.id,
            displayName: (user as SecondMeProfile).displayName,
            bio: (user as SecondMeProfile).bio,
            image: (user as SecondMeProfile).image,
            interests: (user as SecondMeProfile).interests,
          },
        } as JWT;
      }

      // Token即将过期时返回refresh标志
      if (token.expiresAt && Date.now() >= token.expiresAt - 5 * 60 * 1000) {
        return { ...token, error: "TokenExpired" } as JWT;
      }

      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.expiresAt = token.expiresAt as number;
      session.user = {
        ...session.user,
        id: token.user?.id as string,
        displayName: token.user?.displayName as string,
        bio: token.user?.bio as string | undefined,
        interests: token.user?.interests as string[] | undefined,
      };
      return session;
    },

    async redirect({ url, baseUrl }) {
      // 允许相对URL和同域URL
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  debug: process.env.NODE_ENV === "development",
};
