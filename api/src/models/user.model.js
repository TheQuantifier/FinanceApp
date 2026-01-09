// src/models/user.model.js
import { query } from "../config/db.js";

/**
 * Expected Postgres table: users
 * Columns:
 * id (uuid), username, email, password_hash, full_name, location, role, phone_number, bio,
 * created_at, updated_at
 */

export function normalizeIdentifier(value) {
  return String(value || "").toLowerCase().trim();
}

export async function createUser({
  username,
  email,
  passwordHash,
  fullName,
  location = "",
  role = "user",
  phoneNumber = "",
  bio = "",
}) {
  const { rows } = await query(
    `
    INSERT INTO users
      (username, email, password_hash, full_name, location, role, phone_number, bio)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id, username, email, full_name, location, role, phone_number, bio, created_at, updated_at
    `,
    [
      normalizeIdentifier(username),
      normalizeIdentifier(email),
      passwordHash,
      fullName,
      location,
      role,
      phoneNumber,
      bio,
    ]
  );
  return rows[0];
}

export async function findUserById(id) {
  const { rows } = await query(
    `
    SELECT
      id, username, email, full_name, location, role, phone_number, bio, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

export async function findUserAuthById(id) {
  // Includes password_hash for auth-only use
  const { rows } = await query(
    `
    SELECT
      id, username, email, password_hash, full_name, location, role, phone_number, bio, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

export async function findUserAuthByIdentifier(identifier) {
  const ident = normalizeIdentifier(identifier);

  const { rows } = await query(
    `
    SELECT
      id, username, email, password_hash, full_name, location, role, phone_number, bio, created_at, updated_at
    FROM users
    WHERE lower(username) = $1 OR lower(email) = $1
    LIMIT 1
    `,
    [ident]
  );
  return rows[0] || null;
}

export async function updateUserById(id, changes = {}) {
  // whitelist of updatable fields (no password here)
  const allowed = {
    username: "username",
    email: "email",
    fullName: "full_name",
    location: "location",
    role: "role",
    phoneNumber: "phone_number",
    bio: "bio",
  };

  const sets = [];
  const values = [];
  let i = 1;

  for (const [key, col] of Object.entries(allowed)) {
    if (changes[key] !== undefined) {
      const v =
        key === "username" || key === "email" ? normalizeIdentifier(changes[key]) : changes[key];
      sets.push(`${col} = $${i++}`);
      values.push(v);
    }
  }

  if (sets.length === 0) return findUserById(id);

  values.push(id);

  const { rows } = await query(
    `
    UPDATE users
    SET ${sets.join(", ")},
        updated_at = now()
    WHERE id = $${i}
    RETURNING
      id, username, email, full_name, location, role, phone_number, bio, created_at, updated_at
    `,
    values
  );

  return rows[0] || null;
}

export async function updateUserPasswordHash(id, passwordHash) {
  const { rows } = await query(
    `
    UPDATE users
    SET password_hash = $1,
        updated_at = now()
    WHERE id = $2
    RETURNING id
    `,
    [passwordHash, id]
  );
  return rows[0] || null;
}

export async function deleteUserById(id) {
  const { rows } = await query(
    `
    DELETE FROM users
    WHERE id = $1
    RETURNING id
    `,
    [id]
  );
  return rows[0] || null;
}
