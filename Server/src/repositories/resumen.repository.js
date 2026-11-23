import pool from "../database/db.js";

export const obtenerResumenMensual = async (
  usuarioId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT
        o.id,
        o.nombre,
        COALESCE(SUM(g.monto), 0) AS total,
        COALESCE(
          SUM(g.monto) FILTER (WHERE g.pagado),
          0
        ) AS pagado
      FROM origenes_gasto o

      LEFT JOIN gastos g
        ON g.origen_id = o.id
        AND g.usuario_id = $1
        AND g.fecha >= MAKE_DATE($2, $3, 1)
        AND g.fecha < MAKE_DATE($2, $3, 1) + INTERVAL '1 month'

      WHERE o.activo = TRUE
        AND o.usuario_id = $1

      GROUP BY
        o.id,
        o.nombre

      ORDER BY
        o.nombre
    `,
    [
      usuarioId,
      anio,
      mes,
    ]
  );

  return rows;
};

// Los gastos de orígenes desactivados no se cuentan (igual que el total).

export const obtenerGastosPorCategoria = async (
  usuarioId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT
        c.id AS categoria_id,
        c.nombre,
        COALESCE(SUM(g.monto), 0) AS total
      FROM gastos g

      JOIN origenes_gasto o
        ON o.id = g.origen_id
        AND o.usuario_id = $1
        AND o.activo = TRUE

      LEFT JOIN categorias c
        ON c.id = g.categoria_id

      WHERE g.usuario_id = $1
        AND g.fecha >= MAKE_DATE($2, $3, 1)
        AND g.fecha < MAKE_DATE($2, $3, 1) + INTERVAL '1 month'

      GROUP BY
        c.id,
        c.nombre

      ORDER BY total DESC
    `,
    [usuarioId, anio, mes]
  );

  return rows;
};

export const obtenerTotalGastos = async (
  usuarioId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT COALESCE(SUM(g.monto), 0) AS total
      FROM gastos g

      JOIN origenes_gasto o
        ON o.id = g.origen_id
        AND o.usuario_id = $1
        AND o.activo = TRUE

      WHERE g.usuario_id = $1
        AND g.fecha >= MAKE_DATE($2, $3, 1)
        AND g.fecha < MAKE_DATE($2, $3, 1) + INTERVAL '1 month'
    `,
    [usuarioId, anio, mes]
  );

  return Number(rows[0].total);
};

export const obtenerGastosEnCuotas = async (
  usuarioId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT
        g.monto,
        g.cuota_actual,
        g.cuotas_totales
      FROM gastos g

      JOIN origenes_gasto o
        ON o.id = g.origen_id
        AND o.usuario_id = $1
        AND o.activo = TRUE

      WHERE g.usuario_id = $1
        AND g.cuota_actual IS NOT NULL
        AND g.cuotas_totales IS NOT NULL
        AND g.cuota_actual < g.cuotas_totales
        AND g.fecha >= MAKE_DATE($2, $3, 1)
        AND g.fecha < MAKE_DATE($2, $3, 1) + INTERVAL '1 month'
    `,
    [usuarioId, anio, mes]
  );

  return rows;
};
