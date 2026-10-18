import pool from "../database/db.js";
import {
  crearOReactivar,
  validarNombreLibre,
} from "./catalogo.helper.js";

export const obtenerOrigenes = async (
  usuarioId
) => {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        nombre,
        activo,
        creado_en
      FROM origenes_gasto
      WHERE activo = TRUE
        AND usuario_id = $1
      ORDER BY nombre
    `,
    [usuarioId]
  );

  return rows;
};

export const obtenerOrigenPorId = async (
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
      FROM origenes_gasto
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

export const crearOrigen = async (
  usuarioId,
  nombre
) => {
  return await crearOReactivar(
    "origenes_gasto",
    usuarioId,
    nombre
  );
};

export const actualizarOrigen = async (
  usuarioId,
  id,
  nombre
) => {
  await validarNombreLibre(
    "origenes_gasto",
    usuarioId,
    id,
    nombre
  );

  const { rows } = await pool.query(
    `
      UPDATE origenes_gasto
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

export const desactivarOrigen = async (
  usuarioId,
  id
) => {
  const { rows } = await pool.query(
    `
      UPDATE origenes_gasto
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