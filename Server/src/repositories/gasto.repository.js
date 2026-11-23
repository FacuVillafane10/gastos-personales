import pool from "../database/db.js";

export const obtenerGastosMensuales = async (
  usuarioId,
  origenId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT
        g.id,
        g.origen_id,
        g.usuario_id,
        g.fecha,
        g.descripcion,
        g.monto,
        g.categoria_id,
        c.nombre AS categoria,
        g.observaciones,
        g.cuota_actual,
        g.cuotas_totales,
        g.pagado
      FROM gastos g

      LEFT JOIN categorias c
        ON c.id = g.categoria_id

      WHERE g.origen_id = $1
        AND g.usuario_id = $2
        AND g.fecha >= MAKE_DATE($3, $4, 1)
        AND g.fecha < MAKE_DATE($3, $4, 1) + INTERVAL '1 month'

      ORDER BY
        g.fecha,
        g.id
    `,
    [
      origenId,
      usuarioId,
      anio,
      mes,
    ]
  );

  return rows;
};

export const guardarCambiosGastos = async (
  usuarioId,
  origenId,
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

    // El origen debe pertenecer al usuario
    const origen = await client.query(
      `
        SELECT 1
        FROM origenes_gasto
        WHERE id = $1
          AND usuario_id = $2
      `,
      [origenId, usuarioId]
    );

    if (origen.rowCount === 0) {
      throw new Error("Origen no encontrado");
    }

    // Las categorías deben pertenecer al usuario
    const categoriaIds = [
      ...new Set(
        [...crear, ...actualizar]
          .map((gasto) => gasto.categoriaId)
          .filter(Boolean)
      ),
    ];

    if (categoriaIds.length > 0) {
      const categorias = await client.query(
        `
          SELECT id
          FROM categorias
          WHERE usuario_id = $1
            AND id = ANY($2::INTEGER[])
        `,
        [usuarioId, categoriaIds]
      );

      if (categorias.rowCount !== categoriaIds.length) {
        throw new Error("La categoría es inválida");
      }
    }

    const creados = [];
    const actualizados = [];

    // ============================
    // CREAR
    // ============================

    for (const gasto of crear) {
      const { rows } = await client.query(
        `
          INSERT INTO gastos (
            usuario_id,
            origen_id,
            categoria_id,
            fecha,
            descripcion,
            monto,
            cuota_actual,
            cuotas_totales,
            pagado,
            observaciones
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
          )

          RETURNING
            id,
            usuario_id,
            origen_id,
            categoria_id,
            fecha,
            descripcion,
            monto,
            cuota_actual,
            cuotas_totales,
            pagado,
            observaciones
        `,
        [
          usuarioId,
          origenId,
          gasto.categoriaId,
          gasto.fecha,
          gasto.descripcion,
          gasto.monto,
          gasto.cuotaActual,
          gasto.cuotasTotales,
          gasto.pagado,
          gasto.observaciones,
        ]
      );

      creados.push(rows[0]);
    }

    // ============================
    // ACTUALIZAR
    // ============================

    for (const gasto of actualizar) {
      const { rows } = await client.query(
        `
          UPDATE gastos
          SET
            categoria_id = $1,
            fecha = $2,
            descripcion = $3,
            monto = $4,
            cuota_actual = $5,
            cuotas_totales = $6,
            pagado = $7,
            observaciones = $8,
            actualizado_en = CURRENT_TIMESTAMP

          WHERE id = $9
            AND origen_id = $10
            AND usuario_id = $11

          RETURNING
            id,
            usuario_id,
            origen_id,
            categoria_id,
            fecha,
            descripcion,
            monto,
            cuota_actual,
            cuotas_totales,
            pagado,
            observaciones
        `,
        [
          gasto.categoriaId,
          gasto.fecha,
          gasto.descripcion,
          gasto.monto,
          gasto.cuotaActual,
          gasto.cuotasTotales,
          gasto.pagado,
          gasto.observaciones,
          gasto.id,
          origenId,
          usuarioId,
        ]
      );

      if (!rows[0]) {
        throw new Error(
          `No se encontró el gasto ${gasto.id}`
        );
      }

      actualizados.push(rows[0]);
    }

    // ============================
    // ELIMINAR
    // ============================

    let eliminados = 0;

    if (eliminar.length > 0) {
      const result = await client.query(
        `
          DELETE FROM gastos
          WHERE origen_id = $1
            AND usuario_id = $2
            AND id = ANY($3::INTEGER[])
        `,
        [
          origenId,
          usuarioId,
          eliminar,
        ]
      );

      eliminados = result.rowCount;
    }

    // ============================
    // CONFIRMAR TRANSACCIÓN
    // ============================

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