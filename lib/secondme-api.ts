import type { SecondMeTokenResponse, SecondMeUserResponse } from "@/types/auth";

const SECOND_ME_API_BASE = process.env.SECOND_ME_API_BASE_URL ?? "https://api.second.me";
const SECOND_ME_CLIENT_ID = process.env.SECOND_ME_CLIENT_ID;
const SECOND_ME_CLIENT_SECRET = process.env.SECOND_ME_CLIENT_SECRET;

export class SecondMeAPIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "SecondMeAPIError";
  }
}

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Second Me OAuth Token交换
 */
export async function exchangeCodeForToken(code: string): Promise<SecondMeTokenResponse> {
  const redirectUri = process.env.SECOND_ME_REDIRECT_URI
    ?? `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/callback`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: SECOND_ME_CLIENT_ID ?? "",
    client_secret: SECOND_ME_CLIENT_SECRET ?? "",
  });

  console.error("[Token Exchange] URL:", `${SECOND_ME_API_BASE}/oauth/token`);
  console.error("[Token Exchange] redirect_uri:", redirectUri);

  const response = await fetch(`${SECOND_ME_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const rawBody = await response.text();
    console.error("[Token Exchange] FAILED:", response.status, rawBody);
    let errorData: Record<string, string> = {};
    try { errorData = JSON.parse(rawBody) as Record<string, string>; } catch { /* not JSON */ }
    throw new SecondMeAPIError(
      response.status,
      errorData.error ?? errorData.code ?? "TOKEN_EXCHANGE_FAILED",
      errorData.error_description ?? errorData.message ?? `Token exchange failed (${response.status})`
    );
  }

  return response.json() as Promise<SecondMeTokenResponse>;
}

/**
 * 刷新access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
  try {
    const response = await fetch(`${SECOND_ME_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: SECOND_ME_CLIENT_ID,
        client_secret: SECOND_ME_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error ?? "REFRESH_FAILED",
      };
    }

    const data = (await response.json()) as SecondMeTokenResponse;

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  } catch {
    return {
      success: false,
      error: "NETWORK_ERROR",
    };
  }
}

/**
 * Second Me API客户端
 */
export class SecondMeClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${SECOND_ME_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    return response.json() as Promise<T>;
  }

  private async handleError(response: Response): Promise<never> {
    let errorData: { error?: string; error_description?: string } = {};

    try {
      errorData = (await response.json()) as typeof errorData;
    } catch {
      // Ignore JSON parse errors
    }

    const code = errorData.error ?? "UNKNOWN_ERROR";
    const message = errorData.error_description ?? response.statusText;

    throw new SecondMeAPIError(response.status, code, message);
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<SecondMeUserResponse> {
    return this.request<SecondMeUserResponse>("/v1/user");
  }
}

/**
 * 获取有效的access token
 * 如果token即将过期，尝试刷新
 */
export async function getValidAccessToken(
  currentToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
  // Token仍然有效
  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    return {
      accessToken: currentToken,
      refreshToken,
      expiresAt,
    };
  }

  // Token需要刷新
  const result = await refreshAccessToken(refreshToken);

  if (!result.success || !result.accessToken) {
    return null;
  }

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? refreshToken,
    expiresAt: result.expiresAt ?? Date.now(),
  };
}

/**
 * 错误处理辅助函数
 */
export function handleAuthError(error: unknown): {
  code: string;
  message: string;
  shouldRedirect: boolean;
  redirectUrl?: string;
} {
  if (error instanceof SecondMeAPIError) {
    switch (error.statusCode) {
      case 401:
        return {
          code: "UNAUTHORIZED",
          message: "登录已过期，请重新登录",
          shouldRedirect: true,
          redirectUrl: "/",
        };
      case 403:
        return {
          code: "FORBIDDEN",
          message: "没有权限执行此操作",
          shouldRedirect: false,
        };
      case 429:
        return {
          code: "RATE_LIMITED",
          message: "操作过于频繁，请稍后再试",
          shouldRedirect: false,
        };
      case 500:
      case 502:
      case 503:
        return {
          code: "SERVICE_ERROR",
          message: "服务暂时不可用，请稍后再试",
          shouldRedirect: false,
        };
      default:
        return {
          code: "UNKNOWN_ERROR",
          message: error.message ?? "未知错误",
          shouldRedirect: false,
        };
    }
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "发生未知错误",
    shouldRedirect: false,
  };
}
