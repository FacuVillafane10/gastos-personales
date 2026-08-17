import pool from "../database/db.js";

export const obtenerCategorias = async (
  usuarioId
) => {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        nombre,
        activo,
        creado_en
      FROM categorias
      WHERE activo = TRUE
        AND usuario_id = $1
      ORDER BY nombre
    `,
    [usuarioId]
  );

  return rows;
};

export const obtenerCategoriaPorId = async (
  usuarioId,
  id
) => {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        nombre,
        activo,
        creado_en
      FROM categorias
      WHERE id = $1
        AND usuario_id = $2
    `,
    [
      id,
      usuarioId,
    ]
  );

  return rows[0] || null;
};

export const crearCategoria = async (
  usuarioId,
  nombre
) => {
  const { rows } = await pool.query(
    `
      INSERT INTO categorias (
        usuario_id,
        nombre
      )
      VALUES (
        $1,
        $2
      )
      RETURNING
        id,
        nombre,
        activo,
        creado_en
    `,
    [
      usuarioId,
      nombre,
    ]
  );

  return rows[0];
};

export const actualizarCategoria = async (
  usuarioId,
  id,
  nombre
) => {
  const { rows } = await pool.query(
    `
      UPDATE categorias
      SET nombre = $1
      WHERE id = $2
        AND usuario_id = $3
      RETURNING
        id,
        nombre,
        activo,
        creado_en
    `,
    [
      nombre,
      id,
      usuarioId,
    ]
  );

  return rows[0] || null;
};

export const desactivarCategoria = async (
  usuarioId,
  id
) => {
  const { rows } = await pool.query(
    `
      UPDATE categorias
      SET activo = FALSE
      WHERE id = $1
        AND usuario_id = $2
      RETURNING
        id,
        nombre,
        activo
    `,
    [
      id,
      usuarioId,
    ]
  );

  return rows[0] || null;
};