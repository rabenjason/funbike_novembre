import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

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
  console.log("MySQL schema applied. No sample rows were inserted.");
} finally {
  await connection.end();
}
