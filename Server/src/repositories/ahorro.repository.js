import pool from "../database/db.js";

const COLUMNAS = `
  id,
  fecha,
  tipo,
  moneda,
  descripcion,
  monto,
  monto_pesos,
  observaciones
`;

export const obtenerAhorrosMensuales = async (
  usuarioId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT ${COLUMNAS}
      FROM ahorros
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

// Totales por moneda: el neto del mes (depósitos - retiros), el
// acumulado antes del mes y el acumulado al cierre del mes.
export const obtenerTotalesAhorro = async (
  usuarioId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT
        moneda,

        COALESCE(SUM(
          CASE WHEN fecha < MAKE_DATE($2, $3, 1)
            THEN CASE WHEN tipo = 'retiro' THEN -monto ELSE monto END
            ELSE 0
          END
        ), 0) AS anterior,

        COALESCE(SUM(
          CASE WHEN fecha >= MAKE_DATE($2, $3, 1)
            THEN CASE WHEN tipo = 'retiro' THEN -monto ELSE monto END
            ELSE 0
          END
        ), 0) AS mes,

        COALESCE(SUM(
          CASE WHEN fecha >= MAKE_DATE($2, $3, 1)
            AND tipo = 'compra_usd'
            THEN monto_pesos
            ELSE 0
          END
        ), 0) AS pesos_compra_mes

      FROM ahorros
      WHERE usuario_id = $1
        AND fecha < MAKE_DATE($2, $3, 1) + INTERVAL '1 month'
      GROUP BY moneda
    `,
    [usuarioId, anio, mes]
  );

  const totales = {
    mes: { ARS: 0, USD: 0 },
    anterior: { ARS: 0, USD: 0 },
    acumulado: { ARS: 0, USD: 0 },

    // Pesos del mes usados para comprar dólares (salen del disponible)
    pesosCompraMes: 0,
  };

  for (const fila of rows) {
    const moneda = fila.moneda.trim();

    totales.mes[moneda] = Number(fila.mes);

    totales.anterior[moneda] = Number(fila.anterior);

    totales.acumulado[moneda] =
      Number(fila.anterior) + Number(fila.mes);

    totales.pesosCompraMes += Number(
      fila.pesos_compra_mes
    );
  }

  return totales;
};

export const guardarCambiosAhorros = async (
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

    for (const ahorro of crear) {
      const { rows } = await client.query(
        `
          INSERT INTO ahorros (
            usuario_id,
            fecha,
            tipo,
            moneda,
            descripcion,
            monto,
            monto_pesos,
            observaciones
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING ${COLUMNAS}
        `,
        [
          usuarioId,
          ahorro.fecha,
          ahorro.tipo,
          ahorro.moneda,
          ahorro.descripcion,
          ahorro.monto,
          ahorro.montoPesos,
          ahorro.observaciones,
        ]
      );

      creados.push(rows[0]);
    }

    for (const ahorro of actualizar) {
      const { rows } = await client.query(
        `
          UPDATE ahorros
          SET
            fecha = $1,
            tipo = $2,
            moneda = $3,
            descripcion = $4,
            monto = $5,
            monto_pesos = $6,
            observaciones = $7,
            actualizado_en = CURRENT_TIMESTAMP
          WHERE id = $8
            AND usuario_id = $9
          RETURNING ${COLUMNAS}
        `,
        [
          ahorro.fecha,
          ahorro.tipo,
          ahorro.moneda,
          ahorro.descripcion,
          ahorro.monto,
          ahorro.montoPesos,
          ahorro.observaciones,
          ahorro.id,
          usuarioId,
        ]
      );

      if (!rows[0]) {
        throw new Error(
          `No se encontró el ahorro ${ahorro.id}`
        );
      }

      actualizados.push(rows[0]);
    }

    let eliminados = 0;

    if (eliminar.length > 0) {
      const resultado = await client.query(
        `
          DELETE FROM ahorros
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
