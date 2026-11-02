import "dotenv/config";
import mysql, { type RowDataPacket } from "mysql2/promise";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS, normalizeAdminEmail, validatePassword } from "./auth.js";
import { closeDatabase } from "./db.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Configure backend/.env for your existing MySQL database.");
}

const rawEmail = process.env.INITIAL_ADMIN_EMAIL;
const password = process.env.INITIAL_ADMIN_PASSWORD;
if (!rawEmail || !password) {
  throw new Error("Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in backend/.env for this one-time command.");
}
if (rawEmail.toLowerCase().includes("example.com") || password.toLowerCase().includes("replace-with")) {
  throw new Error("Replace the example administrator credentials with your own private values first.");
}

const email = normalizeAdminEmail(rawEmail);
validatePassword(password);
const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
const connection = await mysql.createConnection({ uri: databaseUrl });

const lockName = "funbike_admin_initialization";
try {
  const [lockRows] = await connection.query<RowDataPacket[]>(
    "SELECT GET_LOCK(?, 15) AS acquired",
    [lockName],
  );
  if (Number((lockRows[0] as RowDataPacket & { acquired: number | null } | undefined)?.acquired) !== 1) {
    throw new Error("Could not obtain the administrator setup lock; try again.");
  }

  try {
    const [countRows] = await connection.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS adminCount FROM users WHERE role = 'ADMIN'",
    );
    if (Number((countRows[0] as RowDataPacket & { adminCount: number } | undefined)?.adminCount) > 0) {
      throw new Error("An administrator already exists. The one-time bootstrap command will not replace it.");
    }
    await connection.execute(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'ADMIN')",
      [email, passwordHash],
    );
    console.log(`Administrator account created for ${email}. Remove INITIAL_ADMIN_PASSWORD from backend/.env now.`);
  } finally {
    await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
  }
} finally {
  await connection.end();
  await closeDatabase();
}
