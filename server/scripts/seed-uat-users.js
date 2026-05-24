const bcrypt = require("bcrypt");
const pool = require("../src/config/db");

const DEFAULT_PASSWORD = process.env.UAT_DEFAULT_PASSWORD;

const users = [
  ["UAT Super Admin", "uat_superadmin", "SUPER_ADMIN", null, "UAT_SUPER_ADMIN_PASSWORD"],
  ["UAT CAS", "uat_cas", "CAS", null, "UAT_CAS_PASSWORD"],
  ["UAT AA-CAS", "uat_aa_cas", "AA_CAS", null, "UAT_AA_CAS_PASSWORD"],
  ["UAT PASO-CAS", "uat_paso_cas", "PASO_CAS", null, "UAT_PASO_CAS_PASSWORD"],
  ["UAT Registry", "uat_registry", "REGISTRY", "REGISTRY", "UAT_REGISTRY_PASSWORD"],
  ["UAT CAB", "uat_cab", "CAB", "A&B", "UAT_CAB_PASSWORD"],
  ["UAT Monitor", "uat_monitor", "MONITOR", "CIS", "UAT_MONITOR_PASSWORD"],
  ["UAT Validator", "uat_validator", "VALIDATOR", "AENG", "UAT_VALIDATOR_PASSWORD"],
];

async function seed() {
  for (const [fullName, username, role, branchDru, passwordEnv] of users) {
    const password = process.env[passwordEnv] || DEFAULT_PASSWORD;

    if (!password || password.length < 12) {
      throw new Error(`${passwordEnv} or UAT_DEFAULT_PASSWORD must be at least 12 characters.`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `
        INSERT INTO users (full_name, username, password_hash, role, branch_dru, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        ON CONFLICT (username) DO UPDATE
        SET
          full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          branch_dru = EXCLUDED.branch_dru,
          is_active = TRUE,
          updated_at = NOW()
      `,
      [fullName, username, passwordHash, role, branchDru]
    );

    console.log(`Seeded ${username} (${role})`);
  }

  console.log("UAT users seeded.");
}

seed()
  .catch((error) => {
    console.error("UAT seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
