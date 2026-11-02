import "dotenv/config";
import bcrypt from "bcryptjs";
import { GraphQLError } from "graphql";
import { SignJWT, jwtVerify } from "jose";
import type { RowDataPacket } from "mysql2/promise";
import { queryRows, withTransaction } from "./db.js";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  tokenVersion: number;
};

export type GraphQLContext = {
  user: AuthUser | null;
};

type UserRow = RowDataPacket & AuthUser & { passwordHash?: string };

const JWT_ISSUER = "funbike-api";
const JWT_AUDIENCE = "funbike-admin";
const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const LOGIN_FAILURE_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map<string, { count: number; windowEndsAt: number; blockedUntil: number }>();
let failureCounter = 0;

function invalidCredentials(): GraphQLError {
  return new GraphQLError("Invalid email or password.", {
    extensions: { code: "UNAUTHENTICATED" },
  });
}

function loginIsBlocked(email: string, now: number): boolean {
  const bucket = loginFailures.get(email);
  if (!bucket) return false;
  if (bucket.windowEndsAt <= now && bucket.blockedUntil <= now) {
    loginFailures.delete(email);
    return false;
  }
  return bucket.blockedUntil > now;
}

function recordLoginFailure(email: string, now: number): void {
  let bucket = loginFailures.get(email);
  if (!bucket || bucket.windowEndsAt <= now) {
    bucket = { count: 0, windowEndsAt: now + LOGIN_WINDOW_MS, blockedUntil: 0 };
  }
  bucket.count += 1;
  if (bucket.count >= LOGIN_FAILURE_LIMIT) bucket.blockedUntil = now + LOGIN_WINDOW_MS;
  loginFailures.set(email, bucket);
  failureCounter += 1;
  if (failureCounter % 256 === 0 || loginFailures.size > 10000) {
    for (const [key, value] of loginFailures) {
      if (value.windowEndsAt <= now && value.blockedUntil <= now) loginFailures.delete(key);
    }
  }
}

function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.toLowerCase().includes("replace-with") || Buffer.byteLength(secret, "utf8") < 32) {
    throw new GraphQLError("Server authentication is not configured.", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
  return new TextEncoder().encode(secret);
}

function tokenLifetimeSeconds(): number {
  const value = process.env.JWT_EXPIRES_IN ?? "8h";
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error("JWT_EXPIRES_IN must use a duration such as 15m, 8h, or 7d.");
  const amount = Number(match[1]);
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as "s" | "m" | "h" | "d"];
  const seconds = amount * multiplier;
  if (!Number.isSafeInteger(seconds) || seconds < 60 || seconds > 7 * 86400) {
    throw new Error("JWT_EXPIRES_IN must be between one minute and seven days.");
  }
  return seconds;
}

function publicUser(user: AuthUser) {
  return { id: user.id, email: user.email, role: user.role, isActive: user.isActive };
}

export async function authenticateRequest(headers: Headers): Promise<AuthUser | null> {
  const authorization = headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], jwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    const tokenVersion = typeof payload.ver === "number" ? payload.ver : -1;
    if (!userId || !Number.isSafeInteger(tokenVersion) || tokenVersion < 0) return null;

    const users = await queryRows<UserRow>(
      `SELECT CAST(id AS CHAR) AS id, email, role, is_active AS isActive,
              token_version AS tokenVersion
       FROM users WHERE id = ? AND is_active = TRUE LIMIT 1`,
      [userId],
    );
    const user = users[0];
    if (!user || user.role !== "ADMIN" || Number(user.tokenVersion) !== tokenVersion) return null;
    return { ...user, tokenVersion };
  } catch {
    return null;
  }
}

export function requireAdmin(context: GraphQLContext): AuthUser {
  if (!context.user || !context.user.isActive || context.user.role !== "ADMIN") {
    throw new GraphQLError("Administrator authentication is required.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return context.user;
}

export async function login(emailValue: unknown, passwordValue: unknown) {
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const rateKey = email.slice(0, 254) || "<missing-email>";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const now = Date.now();
  if (loginIsBlocked(rateKey, now)) throw invalidCredentials();

  const users = email && email.length <= 254
    ? await queryRows<UserRow>(
        `SELECT CAST(id AS CHAR) AS id, email, password_hash AS passwordHash,
                role, is_active AS isActive, token_version AS tokenVersion
         FROM users WHERE email = ? LIMIT 1`,
        [email],
      )
    : [];
  const user = users[0];
  const passwordIsWithinLimit = Buffer.byteLength(password, "utf8") <= 72;
  const passwordForComparison = passwordIsWithinLimit ? password : "";
  const comparison = await bcrypt.compare(passwordForComparison, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordIsWithinLimit || !comparison || !user.isActive || user.role !== "ADMIN") {
    recordLoginFailure(rateKey, now);
    throw invalidCredentials();
  }
  loginFailures.delete(rateKey);

  const expiresIn = tokenLifetimeSeconds();
  const accessToken = await new SignJWT({ ver: Number(user.tokenVersion), role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(user.id))
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(jwtSecret());

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn,
    user: publicUser(user),
  };
}

async function verifyCurrentPassword(userId: string, currentPassword: string): Promise<UserRow> {
  if (Buffer.byteLength(currentPassword, "utf8") > 72) {
    throw new GraphQLError("Current password is incorrect.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  const rows = await queryRows<UserRow>(
    `SELECT CAST(id AS CHAR) AS id, email, password_hash AS passwordHash,
            role, is_active AS isActive, token_version AS tokenVersion
     FROM users WHERE id = ? AND is_active = TRUE LIMIT 1`,
    [userId],
  );
  const account = rows[0];
  if (!account?.passwordHash || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
    throw new GraphQLError("Current password is incorrect.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return account;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}

export async function changeEmail(
  context: GraphQLContext,
  currentPasswordValue: unknown,
  newEmailValue: unknown,
): Promise<boolean> {
  const user = requireAdmin(context);
  if (typeof currentPasswordValue !== "string" || typeof newEmailValue !== "string") {
    throw new GraphQLError("Current password and new email are required.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  let newEmail: string;
  try {
    newEmail = normalizeAdminEmail(newEmailValue);
  } catch {
    throw new GraphQLError("Enter a valid email address.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  const account = await verifyCurrentPassword(user.id, currentPasswordValue);
  if (newEmail === account.email.toLowerCase()) {
    throw new GraphQLError("The new email must be different from the current email.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  try {
    await withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `UPDATE users SET email = ?, token_version = token_version + 1
         WHERE id = ? AND token_version = ? AND is_active = TRUE`,
        [newEmail, user.id, account.tokenVersion],
      );
      if ((result as { affectedRows: number }).affectedRows !== 1) {
        throw new GraphQLError("Your session has expired. Sign in again.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
    });
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new GraphQLError("An account with this email already exists.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    throw error;
  }
  return true;
}

export async function changePassword(
  context: GraphQLContext,
  currentPassword: unknown,
  newPassword: unknown,
): Promise<boolean> {
  const user = requireAdmin(context);
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    throw new GraphQLError("Both currentPassword and newPassword are required.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
  validatePassword(newPassword);
  if (currentPassword === newPassword) {
    throw new GraphQLError("Choose a new password different from the current one.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  const account = await verifyCurrentPassword(user.id, currentPassword);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `UPDATE users
       SET password_hash = ?, token_version = token_version + 1,
           password_changed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND token_version = ? AND is_active = TRUE`,
      [passwordHash, user.id, account.tokenVersion],
    );
    if ((result as { affectedRows: number }).affectedRows !== 1) {
      throw new GraphQLError("Your session has expired. Sign in again.", {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }
  });
  return true;
}

export function validatePassword(password: string): void {
  const bytes = Buffer.byteLength(password, "utf8");
  if (password.length < 12 || bytes > 72) {
    throw new GraphQLError("Passwords must be at least 12 characters and no more than 72 UTF-8 bytes.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

export function normalizeAdminEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("INITIAL_ADMIN_EMAIL must be a valid email address.");
  }
  return email;
}

export { BCRYPT_ROUNDS };
