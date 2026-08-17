import pool from "../database/db.js";

export const buscarUsuarioPorEmail = async (email) => {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        nombre,
        email,
        password_hash,
        activo
      FROM usuarios
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
};

export const buscarUsuarioPorId = async (id) => {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        nombre,
        email,
        activo
      FROM usuarios
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};


// ===================================
// CREAR USUARIO
// ===================================

export const crearUsuario = async ({
  nombre,
  email,
  passwordHash,
}) => {
  const { rows } = await pool.query(
    `
      INSERT INTO usuarios (
        nombre,
        email,
        password_hash,
        activo
      )
      VALUES ($1, $2, $3, true)
      RETURNING
        id,
        nombre,
        email,
        activo
    `,
    [
      nombre,
      email,
      passwordHash,
    ]
  );

  return rows[0];
};

export const buscarCredencialesUsuarioPorId = async (
  id
) => {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        password_hash,
        activo
      FROM usuarios
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};


export const actualizarPasswordUsuario = async (
  id,
  passwordHash
) => {
  const { rows } = await pool.query(
    `
      UPDATE usuarios
      SET password_hash = $2
      WHERE id = $1
      RETURNING
        id,
        nombre,
        email,
        activo
    `,
    [
      id,
      passwordHash,
    ]
  );

  return rows[0] || null;
};