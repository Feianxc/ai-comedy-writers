import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    user: {
      id: string;
      displayName?: string;
      bio?: string;
      interests?: string[];
    } & DefaultSession["user"];
  }

  interface User {
    displayName?: string;
    bio?: string;
    interests?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    user?: {
      id: string;
      displayName?: string;
      bio?: string;
      interests?: string[];
    };
    error?: "TokenExpired" | "RefreshTokenError";
  }
}

export interface SecondMeTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface SecondMeUserResponse {
  id: string;
  display_name: string;
  bio?: string;
  avatar?: string;
  interests?: string[];
}

export interface SecondMeProfile {
  id: string;
  displayName: string;
  bio?: string;
  image?: string;
  interests?: string[];
}
