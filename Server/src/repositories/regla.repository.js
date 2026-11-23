import pool from "../database/db.js";

// Reglas para nombrar y categorizar automáticamente lo que viene en
// los resúmenes: "si la descripción empieza con PATRON → nombre y
// categoría".

const COLUMNAS = `
  r.id,
  r.patron,
  r.nombre,
  r.categoria_id,
  c.nombre AS categoria
`;

export const obtenerReglas = async (usuarioId) => {
  const { rows } = await pool.query(
    `
      SELECT ${COLUMNAS}
      FROM reglas_descripcion r
      LEFT JOIN categorias c
        ON c.id = r.categoria_id
      WHERE r.usuario_id = $1
      ORDER BY r.patron
    `,
    [usuarioId]
  );

  return rows;
};

const obtenerRegla = async (usuarioId, id) => {
  const { rows } = await pool.query(
    `
      SELECT ${COLUMNAS}
      FROM reglas_descripcion r
      LEFT JOIN categorias c
        ON c.id = r.categoria_id
      WHERE r.usuario_id = $1
        AND r.id = $2
    `,
    [usuarioId, id]
  );

  return rows[0] || null;
};

// La categoría tiene que ser del usuario y estar activa.
export const categoriaDelUsuario = async (
  usuarioId,
  categoriaId
) => {
  const { rowCount } = await pool.query(
    `
      SELECT 1
      FROM categorias
      WHERE id = $1
        AND usuario_id = $2
        AND activo = TRUE
    `,
    [categoriaId, usuarioId]
  );

  return rowCount > 0;
};

export const crearRegla = async (
  usuarioId,
  { patron, nombre, categoriaId }
) => {
  const { rows } = await pool.query(
    `
      INSERT INTO reglas_descripcion (
        usuario_id,
        patron,
        nombre,
        categoria_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [usuarioId, patron, nombre, categoriaId]
  );

  return await obtenerRegla(usuarioId, rows[0].id);
};

export const actualizarRegla = async (
  usuarioId,
  id,
  { patron, nombre, categoriaId }
) => {
  const { rowCount } = await pool.query(
    `
      UPDATE reglas_descripcion
      SET patron = $3,
          nombre = $4,
          categoria_id = $5
      WHERE usuario_id = $1
        AND id = $2
    `,
    [usuarioId, id, patron, nombre, categoriaId]
  );

  return rowCount > 0
    ? await obtenerRegla(usuarioId, id)
    : null;
};

export const borrarRegla = async (usuarioId, id) => {
  const { rowCount } = await pool.query(
    `
      DELETE FROM reglas_descripcion
      WHERE usuario_id = $1
        AND id = $2
    `,
    [usuarioId, id]
  );

  return rowCount > 0;
};
