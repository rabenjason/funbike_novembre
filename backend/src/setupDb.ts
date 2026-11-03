import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql, { type RowDataPacket } from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Copy backend/.env.example to backend/.env first.");
}

const connection = await mysql.createConnection({
  uri: databaseUrl,
  multipleStatements: true,
});

try {
  const schemaPath = fileURLToPath(new URL("../database/schema.sql", import.meta.url));
  const schema = await readFile(schemaPath, "utf8");
  await connection.query(schema);

  // CREATE TABLE IF NOT EXISTS does not add columns to a table created by an
  // earlier release. Keep this migration idempotent for existing installations.
  const [recommendationColumn] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'motorcycles'
       AND COLUMN_NAME = 'recommendation'
     LIMIT 1`,
  );
  if (recommendationColumn.length === 0) {
    await connection.query("ALTER TABLE motorcycles ADD COLUMN recommendation TEXT NULL");
    console.log("Database upgrade applied: motorcycles.recommendation added.");
  }

  const [newArrivalColumn] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'new_arrival_order'
     LIMIT 1`,
  );
  if (newArrivalColumn.length === 0) {
    await connection.query("ALTER TABLE products ADD COLUMN new_arrival_order SMALLINT NULL");
    console.log("Database upgrade applied: products.new_arrival_order added.");
  }

  console.log("MySQL schema applied. No sample rows were inserted.");
} finally {
  await connection.end();
}
