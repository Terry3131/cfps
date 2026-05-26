const bcrypt = require("bcrypt");
const pool = require("../config/db");

let hasTokenVersionColumnCache = null;

const hasTokenVersionColumn = async () => {
  if (hasTokenVersionColumnCache !== null) {
    return hasTokenVersionColumnCache;
  }

  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'token_version'
    ) AS exists
  `);

  hasTokenVersionColumnCache = result.rows[0]?.exists === true;

  return hasTokenVersionColumnCache;
};

const findUserByUsername = async (username) => {
  const includeTokenVersion = await hasTokenVersionColumn();

  const query = includeTokenVersion
    ? `
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
    `
    : `
      SELECT
        id,
        full_name,
        username,
        password_hash,
        role,
        branch_dru,
        is_active,
        0 AS token_version
      FROM users
      WHERE username = $1
      LIMIT 1
    `;

  const result = await pool.query(query, [username]);

  return result.rows[0];
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  findUserByUsername,
  comparePassword,
};