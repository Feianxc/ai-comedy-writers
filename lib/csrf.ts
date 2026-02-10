import { randomBytes, timingSafeEqual } from "crypto";

interface StateData {
  random: string;
  timestamp: number;
  redirectUrl?: string;
}

const STATE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * 生成OAuth state参数
 * 包含随机数和时间戳用于CSRF防护
 */
export function generateState(redirectUrl?: string): string {
  const stateData: StateData = {
    random: randomBytes(16).toString("hex"),
    timestamp: Date.now(),
    redirectUrl,
  };

  return Buffer.from(JSON.stringify(stateData)).toString("base64");
}

/**
 * 解码state参数，返回StateData或null
 */
function decodeState(state: string): StateData | null {
  try {
    const stateString = Buffer.from(state, "base64").toString("utf-8");
    const stateData = JSON.parse(stateString) as StateData;

    if (
      !stateData ||
      typeof stateData.random !== "string" ||
      typeof stateData.timestamp !== "number"
    ) {
      return null;
    }

    return stateData;
  } catch {
    return null;
  }
}

/**
 * 验证state参数
 * 检查格式有效性和时间戳（5分钟有效期）
 */
export function verifyState(state: string): { valid: boolean; redirectUrl?: string } {
  const stateData = decodeState(state);
  if (!stateData) {
    return { valid: false };
  }

  if (Date.now() - stateData.timestamp > STATE_MAX_AGE_MS) {
    return { valid: false };
  }

  return {
    valid: true,
    redirectUrl: stateData.redirectUrl,
  };
}

/**
 * 常量时间比较，防止时序攻击
 */
function isStateEqual(receivedState: string, storedState: string): boolean {
  const received = Buffer.from(receivedState);
  const stored = Buffer.from(storedState);

  if (received.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(received, stored);
}

/**
 * 严格验证state参数
 * 比较接收的state和存储的state是否一致
 */
export function verifyStateStrict(
  receivedState: string,
  storedState: string
): { valid: boolean; redirectUrl?: string } {
  if (!isStateEqual(receivedState, storedState)) {
    return { valid: false };
  }

  return verifyState(receivedState);
}
