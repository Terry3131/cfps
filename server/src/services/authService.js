const bcrypt = require("bcrypt");
const pool = require("../config/db");

const findUserByUsername = async (username) => {
  const query = `
    SELECT id, full_name, username, password_hash, role, branch_dru, is_active
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
  comparePassword
};
