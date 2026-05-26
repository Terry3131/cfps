const bcrypt = require("bcrypt");
const pool = require("../config/db");

const findUserByUsername = async (username) => {
  const result = await pool.query(
    `
    SELECT
      id,
      full_name,
      username,
      password_hash,
      role,
      branch_dru,
      is_active,
      COALESCE(token_version, 0) AS token_version
    FROM users
    WHERE username = $1
    LIMIT 1
    `,
    [username]
  );

  return result.rows[0];
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  findUserByUsername,
  comparePassword,
};