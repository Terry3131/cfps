const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

const sqlPath = path.join(__dirname, "../src/db/sql/012_users_compat_columns.sql");

async function repair() {
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query("SET search_path TO public");
  await pool.query(sql);
  console.log("Users table compatibility repair completed.");
}

repair()
  .catch((error) => {
    console.error("Users table repair failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
