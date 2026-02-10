import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = (() => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    return new TextEncoder().encode(secret);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET environment variable must be set in production"
    );
  }

  // 开发环境使用安全的默认值（每次重启变化）
  return new TextEncoder().encode("dev-secret-" + Date.now());
})();

export interface SessionPayload {
  user: {
    id: string;
    displayName: string;
    bio?: string;
    image?: string;
    interests?: string[];
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * 签名session token
 */
export async function signToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

/**
 * 验证session token
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
