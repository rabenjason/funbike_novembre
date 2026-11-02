import "dotenv/config";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
let pool: Pool | null = databaseUrl ? mysql.createPool(databaseUrl) : null;

export function getPool(): Pool {
  if (!pool) {
    throw new Error("DATABASE_URL is missing. Copy backend/.env.example to backend/.env and configure MySQL.");
  }
  return pool;
}

export async function queryRows<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(sql, params as never[]);
  return rows as T[];
}

export async function withTransaction<T>(
  work: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}

export async function databaseHealth(): Promise<string> {
  if (!pool) return "not_configured";
  try {
    await pool.query("SELECT 1");
    return "connected";
  } catch {
    return "unavailable";
  }
}
