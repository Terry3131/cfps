setMinimumMilliseconds("DB_CONNECTION_TIMEOUT", 30000);
setMinimumMilliseconds("DB_IDLE_TIMEOUT", 60000);

if (!process.env.DB_POOL_MAX) {
  process.env.DB_POOL_MAX = "1";
}

function setMinimumMilliseconds(name, minimum) {
  const current = Number.parseInt(process.env[name], 10);

  if (!Number.isFinite(current) || current < minimum) {
    process.env[name] = String(minimum);
  }
}
