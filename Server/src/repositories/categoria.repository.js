import pool from "../database/db.js";
import {
  crearOReactivar,
  validarNombreLibre,
} from "./catalogo.helper.js";

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
  return await crearOReactivar(
    "categorias",
    usuarioId,
    nombre
  );
};

export const actualizarCategoria = async (
  usuarioId,
  id,
  nombre
) => {
  await validarNombreLibre(
    "categorias",
    usuarioId,
    id,
    nombre
  );

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