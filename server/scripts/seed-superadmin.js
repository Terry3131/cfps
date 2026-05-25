const bcrypt = require("bcrypt");
const pool = require("../src/config/db");

const username = process.env.SUPERADMIN_USERNAME || "superadmin";
const fullName = process.env.SUPERADMIN_FULL_NAME || "Super Admin";
const password = process.env.SUPERADMIN_PASSWORD;

async function seed() {
  if (!password || password.length < 12) {
    throw new Error("SUPERADMIN_PASSWORD must be set and must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `
      INSERT INTO users (full_name, username, password_hash, role, branch_dru, is_active)
      VALUES ($1, $2, $3, 'SUPER_ADMIN', NULL, TRUE)
      ON CONFLICT (username) DO UPDATE
      SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = 'SUPER_ADMIN',
        branch_dru = NULL,
        is_active = TRUE,
        updated_at = NOW()
    `,
    [fullName, username, passwordHash]
  );

  console.log(`Seeded ${username} (SUPER_ADMIN)`);
}

seed()
  .catch((error) => {
    console.error("Superadmin seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
