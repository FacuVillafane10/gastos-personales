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
        COALESCE(SUM(g.monto), 0) AS total
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