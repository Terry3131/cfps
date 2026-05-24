const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

const sqlDir = path.join(__dirname, "../src/db/sql");

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _cfps_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  const files = fs
    .readdirSync(sqlDir)
    .filter((file) => file.endsWith(".sql") && !file.startsWith("sqlite_"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No migration files found in ${sqlDir}`);
  }

  for (const file of files) {
    const applied = await pool.query(
      "SELECT 1 FROM _cfps_migrations WHERE filename = $1",
      [file]
    );

    if (applied.rowCount > 0) {
      console.log(`Skipping ${file}; already applied.`);
      continue;
    }

    const fullPath = path.join(sqlDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");

    console.log(`Applying ${file}...`);
    await pool.query("BEGIN");

    try {
      await pool.query(sql);
      await pool.query(
        "INSERT INTO _cfps_migrations (filename) VALUES ($1)",
        [file]
      );
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  console.log("Database migrations completed.");
}

migrate()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
