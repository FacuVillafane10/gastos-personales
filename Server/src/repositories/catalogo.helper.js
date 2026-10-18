import pool from "../database/db.js";

// Solo se usan nombres de tabla internos (nunca datos del usuario).
const TABLAS = new Set(["categorias", "origenes_gasto"]);

const verificarTabla = (tabla) => {
  if (!TABLAS.has(tabla)) {
    throw new Error("Tabla inválida");
  }
};

const errorDuplicado = () =>
  Object.assign(new Error("Nombre duplicado"), {
    code: "23505",
  });

// Crea el registro. Si existe uno desactivado con el mismo nombre
// (sin distinguir mayúsculas) lo reactiva; si existe uno activo, falla.
export const crearOReactivar = async (
  tabla,
  usuarioId,
  nombre
) => {
  verificarTabla(tabla);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existente = await client.query(
      `
        SELECT id, activo
        FROM ${tabla}
        WHERE usuario_id = $1
          AND LOWER(nombre) = LOWER($2)
        LIMIT 1
        FOR UPDATE
      `,
      [usuarioId, nombre]
    );

    let fila;

    if (existente.rows[0]) {
      if (existente.rows[0].activo) {
        throw errorDuplicado();
      }

      ({ rows: [fila] } = await client.query(
        `
          UPDATE ${tabla}
          SET activo = TRUE,
              nombre = $2
          WHERE id = $1
          RETURNING id, nombre, activo, creado_en
        `,
        [existente.rows[0].id, nombre]
      ));
    } else {
      ({ rows: [fila] } = await client.query(
        `
          INSERT INTO ${tabla} (usuario_id, nombre)
          VALUES ($1, $2)
          RETURNING id, nombre, activo, creado_en
        `,
        [usuarioId, nombre]
      ));
    }

    await client.query("COMMIT");

    return fila;
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};

// Falla si otro registro del usuario ya usa ese nombre.
export const validarNombreLibre = async (
  tabla,
  usuarioId,
  id,
  nombre
) => {
  verificarTabla(tabla);

  const { rows } = await pool.query(
    `
      SELECT 1
      FROM ${tabla}
      WHERE usuario_id = $1
        AND LOWER(nombre) = LOWER($2)
        AND id <> $3
      LIMIT 1
    `,
    [usuarioId, nombre, id]
  );

  if (rows[0]) {
    throw errorDuplicado();
  }
};
