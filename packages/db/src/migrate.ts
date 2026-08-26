import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabaseClient } from "./index.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run database migrations");
}

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const { db, pool } = createDatabaseClient(databaseUrl);

try {
  await migrate(db, { migrationsFolder });
  console.log("Database migrations applied successfully");
} finally {
  await pool.end();
}
