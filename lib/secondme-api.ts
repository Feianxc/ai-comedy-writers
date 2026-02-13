import type { SecondMeTokenResponse, SecondMeUserResponse } from "@/types/auth";

const DEFAULT_SECOND_ME_API_BASE = "https://app.mindos.com/gate/lab";
const LEGACY_SECOND_ME_API_BASE = "https://api.second.me";

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  let normalized = value.replace(/\r?\n/g, "").trim();
  normalized = normalized.replace(/^\\n+|\\n+$/g, "").trim();

  while (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized.length > 0 ? normalized : undefined;
}

function resolveApiBaseUrl(): string {
  const configuredBase = normalizeEnvValue(process.env.SECOND_ME_API_BASE_URL);

  if (!configuredBase) {
    return DEFAULT_SECOND_ME_API_BASE;
  }

  const normalizedBase = configuredBase.replace(/\/+$/, "");

  if (/^https?:\/\/api\.second\.me$/i.test(normalizedBase)) {
    console.warn(
      "[SecondMe API] Deprecated SECOND_ME_API_BASE_URL detected; using app.mindos.com gateway"
    );
    return DEFAULT_SECOND_ME_API_BASE;
  }

  return normalizedBase;
}

const SECOND_ME_API_BASE = resolveApiBaseUrl();
const SECOND_ME_CLIENT_ID = normalizeEnvValue(process.env.SECOND_ME_CLIENT_ID);
const SECOND_ME_CLIENT_SECRET = normalizeEnvValue(process.env.SECOND_ME_CLIENT_SECRET);
const NEXTAUTH_URL = normalizeEnvValue(process.env.NEXTAUTH_URL) ?? "http://localhost:3000";
const SECOND_ME_REDIRECT_URI =
  normalizeEnvValue(process.env.SECOND_ME_REDIRECT_URI)
  ?? `${NEXTAUTH_URL}/api/auth/callback`;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item));

  return normalized.length > 0 ? normalized : undefined;
}

function buildUrl(path: string, baseUrl: string = SECOND_ME_API_BASE): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function buildEndpointCandidates(primaryPath: string, legacyPath: string): string[] {
  const candidates = [buildUrl(primaryPath), buildUrl(legacyPath)];

  if (SECOND_ME_API_BASE !== LEGACY_SECOND_ME_API_BASE) {
    candidates.push(buildUrl(legacyPath, LEGACY_SECOND_ME_API_BASE));
  }

  return [...new Set(candidates)];
}

function getOAuthCredentials(): { clientId: string; clientSecret: string } {
  if (!SECOND_ME_CLIENT_ID || !SECOND_ME_CLIENT_SECRET) {
    throw new Error("Missing SECOND_ME_CLIENT_ID or SECOND_ME_CLIENT_SECRET");
  }

  return {
    clientId: SECOND_ME_CLIENT_ID,
    clientSecret: SECOND_ME_CLIENT_SECRET,
  };
}

function parseErrorInfo(payload: unknown, fallbackStatusText: string): { code: string; message: string } {
  if (isRecord(payload)) {
    const code =
      readString(payload.subCode)
      ?? readString(payload.error)
      ?? readString(payload.code)
      ?? "SECOND_ME_API_ERROR";

    const message =
      readString(payload.message)
      ?? readString(payload.error_description)
      ?? readString(payload.error)
      ?? fallbackStatusText;

    return { code, message };
  }

  if (typeof payload === "string") {
    return {
      code: "SECOND_ME_API_ERROR",
      message: payload || fallbackStatusText,
    };
  }

  return {
    code: "SECOND_ME_API_ERROR",
    message: fallbackStatusText,
  };
}

function unwrapApiEnvelope(payload: unknown): unknown {
  if (!isRecord(payload) || !("code" in payload)) {
    return payload;
  }

  const codeValue = readNumber(payload.code);

  if (codeValue === undefined) {
    return payload;
  }

  if (codeValue !== 0) {
    throw new SecondMeAPIError(
      200,
      readString(payload.subCode) ?? `SECOND_ME_API_${codeValue}`,
      readString(payload.message) ?? "Second Me API returned business error",
      payload
    );
  }

  return "data" in payload ? payload.data : payload;
}

async function requestJson(url: string, options: RequestInit): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new SecondMeAPIError(
      0,
      "NETWORK_ERROR",
      `Failed to request ${url}`,
      error
    );
  }

  const rawBody = await response.text();
  let parsedBody: unknown = undefined;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const errorInfo = parseErrorInfo(parsedBody, response.statusText || `HTTP ${response.status}`);
    throw new SecondMeAPIError(response.status, errorInfo.code, errorInfo.message, parsedBody);
  }

  return unwrapApiEnvelope(parsedBody);
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof SecondMeAPIError && error.statusCode === 404;
}

async function requestWithNotFoundFallback(
  candidateUrls: string[],
  requestFactory: (url: string) => Promise<unknown>
): Promise<unknown> {
  let lastError: unknown;

  for (let index = 0; index < candidateUrls.length; index += 1) {
    const candidateUrl = candidateUrls[index];

    try {
      return await requestFactory(candidateUrl);
    } catch (error) {
      lastError = error;

      const canFallback = index < candidateUrls.length - 1 && isNotFoundError(error);
      if (!canFallback) {
        throw error;
      }

      console.warn(`[SecondMe API] Endpoint not found: ${candidateUrl}, fallback to next candidate`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Second Me API request failed");
}

function normalizeTokenResponse(payload: unknown): SecondMeTokenResponse {
  if (!isRecord(payload)) {
    throw new SecondMeAPIError(500, "INVALID_TOKEN_RESPONSE", "Unexpected token response payload");
  }

  const accessToken = readString(payload.access_token) ?? readString(payload.accessToken);
  const refreshToken = readString(payload.refresh_token) ?? readString(payload.refreshToken) ?? "";
  const tokenType = readString(payload.token_type) ?? readString(payload.tokenType) ?? "Bearer";
  const expiresIn = readNumber(payload.expires_in) ?? readNumber(payload.expiresIn);

  if (!accessToken || expiresIn === undefined) {
    throw new SecondMeAPIError(500, "INVALID_TOKEN_RESPONSE", "Token response missing required fields");
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    token_type: tokenType,
  };
}

function normalizeUserResponse(payload: unknown): SecondMeUserResponse {
  if (!isRecord(payload)) {
    throw new SecondMeAPIError(500, "INVALID_USER_RESPONSE", "Unexpected user response payload");
  }

  const id = readString(payload.id) ?? readString(payload.userId);
  const displayName =
    readString(payload.display_name)
    ?? readString(payload.displayName)
    ?? readString(payload.name);

  if (!id || !displayName) {
    throw new SecondMeAPIError(500, "INVALID_USER_RESPONSE", "User response missing required fields");
  }

  const bio = readString(payload.bio) ?? readString(payload.selfIntroduction);
  const avatar = readString(payload.avatar) ?? readString(payload.image);
  const interests = readStringArray(payload.interests) ?? readStringArray(payload.tags);

  return {
    id,
    display_name: displayName,
    bio,
    avatar,
    interests,
  };
}

export class SecondMeAPIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
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

export async function exchangeCodeForToken(code: string): Promise<SecondMeTokenResponse> {
  const { clientId, clientSecret } = getOAuthCredentials();

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SECOND_ME_REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const candidateUrls = buildEndpointCandidates("/api/oauth/token/code", "/oauth/token");
  console.error("[Token Exchange] URL:", candidateUrls[0]);
  console.error("[Token Exchange] redirect_uri:", SECOND_ME_REDIRECT_URI);

  const payload = await requestWithNotFoundFallback(candidateUrls, (url) =>
    requestJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })
  );

  return normalizeTokenResponse(payload);
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
  try {
    const { clientId, clientSecret } = getOAuthCredentials();

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const candidateUrls = buildEndpointCandidates("/api/oauth/token/refresh", "/oauth/token");
    const payload = await requestWithNotFoundFallback(candidateUrls, (url) =>
      requestJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      })
    );

    const data = normalizeTokenResponse(payload);

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "REFRESH_FAILED",
    };
  }
}

export class SecondMeClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getCurrentUser(): Promise<SecondMeUserResponse> {
    const candidateUrls = buildEndpointCandidates("/api/secondme/user/info", "/v1/user");

    const payload = await requestWithNotFoundFallback(candidateUrls, (url) =>
      requestJson(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })
    );

    return normalizeUserResponse(payload);
  }
}

export async function getValidAccessToken(
  currentToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    return {
      accessToken: currentToken,
      refreshToken,
      expiresAt,
    };
  }

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
