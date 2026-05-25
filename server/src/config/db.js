const { Pool } = require("pg");
const {
  DATABASE_URL,
  DB_POOL_MAX,
  DB_IDLE_TIMEOUT,
  DB_CONNECTION_TIMEOUT,
} = require("./env");

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: parsePositiveInteger(DB_POOL_MAX, 20),
  idleTimeoutMillis: parsePositiveInteger(DB_IDLE_TIMEOUT, 30000),
  connectionTimeoutMillis: parsePositiveInteger(DB_CONNECTION_TIMEOUT, 2000),
  ssl: shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;

function shouldUseSsl(connectionString = "") {
  return (
    /sslmode=require/i.test(connectionString) ||
    /\.supabase\./i.test(connectionString) ||
    /\.pooler\.supabase\.com/i.test(connectionString)
  );
}
