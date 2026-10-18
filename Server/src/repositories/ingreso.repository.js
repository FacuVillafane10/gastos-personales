import pool from "../database/db.js";

export const obtenerIngresosMensuales = async (
  usuarioId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        fecha,
        descripcion,
        monto,
        observaciones
      FROM ingresos
      WHERE usuario_id = $1
        AND fecha >= MAKE_DATE($2, $3, 1)
        AND fecha < MAKE_DATE($2, $3, 1) + INTERVAL '1 month'
      ORDER BY
        fecha,
        id
    `,
    [usuarioId, anio, mes]
  );

  return rows;
};

export const obtenerTotalIngresos = async (
  usuarioId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM ingresos
      WHERE usuario_id = $1
        AND fecha >= MAKE_DATE($2, $3, 1)
        AND fecha < MAKE_DATE($2, $3, 1) + INTERVAL '1 month'
    `,
    [usuarioId, anio, mes]
  );

  return Number(rows[0].total);
};

export const guardarCambiosIngresos = async (
  usuarioId,
  cambios
) => {
  const client = await pool.connect();

  const {
    crear = [],
    actualizar = [],
    eliminar = [],
  } = cambios;

  try {
    await client.query("BEGIN");

    const creados = [];
    const actualizados = [];

    for (const ingreso of crear) {
      const { rows } = await client.query(
        `
          INSERT INTO ingresos (
            usuario_id,
            fecha,
            descripcion,
            monto,
            observaciones
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id,
            fecha,
            descripcion,
            monto,
            observaciones
        `,
        [
          usuarioId,
          ingreso.fecha,
          ingreso.descripcion,
          ingreso.monto,
          ingreso.observaciones,
        ]
      );

      creados.push(rows[0]);
    }

    for (const ingreso of actualizar) {
      const { rows } = await client.query(
        `
          UPDATE ingresos
          SET
            fecha = $1,
            descripcion = $2,
            monto = $3,
            observaciones = $4,
            actualizado_en = CURRENT_TIMESTAMP
          WHERE id = $5
            AND usuario_id = $6
          RETURNING
            id,
            fecha,
            descripcion,
            monto,
            observaciones
        `,
        [
          ingreso.fecha,
          ingreso.descripcion,
          ingreso.monto,
          ingreso.observaciones,
          ingreso.id,
          usuarioId,
        ]
      );

      if (!rows[0]) {
        throw new Error(
          `No se encontró el ingreso ${ingreso.id}`
        );
      }

      actualizados.push(rows[0]);
    }

    let eliminados = 0;

    if (eliminar.length > 0) {
      const resultado = await client.query(
        `
          DELETE FROM ingresos
          WHERE usuario_id = $1
            AND id = ANY($2::INTEGER[])
        `,
        [usuarioId, eliminar]
      );

      eliminados = resultado.rowCount;
    }

    await client.query("COMMIT");

    return {
      creados,
      actualizados,
      eliminados,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};
