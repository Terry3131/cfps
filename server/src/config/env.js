require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";
const DEFAULT_JWT_SECRETS = new Set([
  "change_this_to_a_long_random_secret",
  "CHANGE_TO_LONG_RANDOM_SECRET",
]);

const env = {
  NODE_ENV,
  PORT: process.env.PORT || 5000,
  HOST: process.env.HOST || "127.0.0.1",
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
  ENFORCE_HTTPS: parseBoolean(process.env.ENFORCE_HTTPS, NODE_ENV === "production"),
  TRUST_PROXY: parseBoolean(process.env.TRUST_PROXY, NODE_ENV === "production"),
  DB_POOL_MAX: process.env.DB_POOL_MAX || "20",
  DB_IDLE_TIMEOUT: process.env.DB_IDLE_TIMEOUT || "30000",
  DB_CONNECTION_TIMEOUT: process.env.DB_CONNECTION_TIMEOUT || "2000"
};

validateProductionEnv(env);

module.exports = env;

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function validateProductionEnv(values) {
  if (values.NODE_ENV !== "production") return;

  const errors = [];
  const corsOrigin = String(values.CORS_ORIGIN || "").trim();

  if (!values.DATABASE_URL) {
    errors.push("DATABASE_URL is required in production.");
  }

  if (
    !values.JWT_SECRET ||
    values.JWT_SECRET.length < 32 ||
    DEFAULT_JWT_SECRETS.has(values.JWT_SECRET)
  ) {
    errors.push("JWT_SECRET must be a long non-default secret in production.");
  }

  if (!corsOrigin || corsOrigin.includes("your-domain") || corsOrigin.includes("example.")) {
    errors.push("CORS_ORIGIN must be set to the real production frontend origin.");
  }

  if (errors.length > 0) {
    throw new Error(`Unsafe production configuration: ${errors.join(" ")}`);
  }
}
