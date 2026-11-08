// In-memory sliding window rate limiter and brute-force protector

interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
}

interface BruteForceRecord {
  attempts: number;
  lockedUntil: number | null;
}

const sendAttempts = new Map<string, RateLimitRecord>();
const verifyAttempts = new Map<string, BruteForceRecord>();

// Config
const OTP_SEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between sends
const OTP_SEND_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_SEND_MAX_PER_WINDOW = 3; // Max 3 OTP sends per 10 mins

const OTP_VERIFY_MAX_ATTEMPTS = 5; // Max 5 failed attempts
const OTP_VERIFY_LOCKOUT_MS = 15 * 60 * 1000; // 15 mins lockout

export function checkOtpSendRateLimit(identifier: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
} {
  const now = Date.now();
  const record = sendAttempts.get(identifier);

  if (!record) {
    sendAttempts.set(identifier, {
      count: 1,
      firstRequestTime: now,
      lastRequestTime: now,
    });
    return { allowed: true };
  }

  // 1. Check minimum interval cooldown between consecutive sends
  const timeSinceLast = now - record.lastRequestTime;
  if (timeSinceLast < OTP_SEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_SEND_COOLDOWN_MS - timeSinceLast) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: waitSec,
      reason: `Please wait ${waitSec}s before requesting another code.`,
    };
  }

  // 2. Check sliding window max count
  const windowAge = now - record.firstRequestTime;
  if (windowAge > OTP_SEND_WINDOW_MS) {
    // Reset window
    sendAttempts.set(identifier, {
      count: 1,
      firstRequestTime: now,
      lastRequestTime: now,
    });
    return { allowed: true };
  }

  if (record.count >= OTP_SEND_MAX_PER_WINDOW) {
    const waitSec = Math.ceil((OTP_SEND_WINDOW_MS - windowAge) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: waitSec,
      reason: `Too many OTP requests. Please try again in ${Math.ceil(waitSec / 60)} minutes.`,
    };
  }

  // Increment count
  record.count += 1;
  record.lastRequestTime = now;
  sendAttempts.set(identifier, record);
  return { allowed: true };
}

export function checkOtpVerifyBruteForce(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntilSeconds?: number;
} {
  const now = Date.now();
  const record = verifyAttempts.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: OTP_VERIFY_MAX_ATTEMPTS };
  }

  // If locked, check if lockout expired
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const waitSec = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntilSeconds: waitSec,
      };
    }
    // Lockout expired, reset
    verifyAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: OTP_VERIFY_MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, OTP_VERIFY_MAX_ATTEMPTS - record.attempts);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

export function recordFailedOtpVerifyAttempt(identifier: string): {
  locked: boolean;
  remainingAttempts: number;
  lockoutMinutes?: number;
} {
  const now = Date.now();
  let record = verifyAttempts.get(identifier);

  if (!record) {
    record = { attempts: 0, lockedUntil: null };
  }

  record.attempts += 1;

  if (record.attempts >= OTP_VERIFY_MAX_ATTEMPTS) {
    record.lockedUntil = now + OTP_VERIFY_LOCKOUT_MS;
    verifyAttempts.set(identifier, record);
    return {
      locked: true,
      remainingAttempts: 0,
      lockoutMinutes: Math.ceil(OTP_VERIFY_LOCKOUT_MS / (60 * 1000)),
    };
  }

  verifyAttempts.set(identifier, record);
  return {
    locked: false,
    remainingAttempts: OTP_VERIFY_MAX_ATTEMPTS - record.attempts,
  };
}

export function recordSuccessfulOtpVerify(identifier: string): void {
  verifyAttempts.delete(identifier);
}

// For unit testing: clear in-memory stores
export function _resetRateLimits(): void {
  sendAttempts.clear();
  verifyAttempts.clear();
}
