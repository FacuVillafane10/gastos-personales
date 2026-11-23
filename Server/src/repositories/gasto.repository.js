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

// Un gasto nuevo en cuotas (ej. 1/6) deja cargadas las cuotas que
// faltan (2/6 a 6/6) en los meses siguientes, mismo día del mes (si el
// mes es más corto, el último día). No se duplica una cuota que ya
// existe en ese mes con la misma descripción, número e importe (por
// ejemplo, si se cargó antes o se importó del resumen). Devuelve
// cuántas cuotas se crearon.
const crearCuotasFuturas = async (
  client,
  usuarioId,
  origenId,
  gastos
) => {
  let creadas = 0;

  // Cuántas cuotas iguales ya había en cada mes y cuántas de esas ya
  // se "usaron" para otro gasto de este mismo guardado.
  const existentes = new Map();

  for (const gasto of gastos) {
    if (
      !gasto.cuotaActual ||
      !gasto.cuotasTotales ||
      gasto.cuotaActual >= gasto.cuotasTotales
    ) {
      continue;
    }

    for (
      let meses = 1;
      gasto.cuotaActual + meses <= gasto.cuotasTotales;
      meses++
    ) {
      const cuota = gasto.cuotaActual + meses;

      const clave = [
        gasto.fecha,
        meses,
        gasto.descripcion.trim().toLowerCase(),
        cuota,
        gasto.cuotasTotales,
        gasto.monto,
      ].join("|");

      if (!existentes.has(clave)) {
        const { rows } = await client.query(
          `
            SELECT COUNT(*)::INTEGER AS cantidad
            FROM gastos
            WHERE usuario_id = $1
              AND origen_id = $2
              AND LOWER(TRIM(descripcion)) = LOWER(TRIM($3))
              AND cuota_actual = $4
              AND cuotas_totales = $5
              AND monto = $6
              AND fecha >= DATE_TRUNC(
                'month',
                $7::DATE + MAKE_INTERVAL(months => $8)
              )
              AND fecha < DATE_TRUNC(
                'month',
                $7::DATE + MAKE_INTERVAL(months => $8)
              ) + INTERVAL '1 month'
          `,
          [
            usuarioId,
            origenId,
            gasto.descripcion,
            cuota,
            gasto.cuotasTotales,
            gasto.monto,
            gasto.fecha,
            meses,
          ]
        );

        existentes.set(clave, {
          cantidad: rows[0].cantidad,
          usadas: 0,
        });
      }

      const registro = existentes.get(clave);

      if (registro.usadas < registro.cantidad) {
        registro.usadas++;

        continue;
      }

      await client.query(
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
            ($4::DATE + MAKE_INTERVAL(months => $5))::DATE,
            $6,
            $7,
            $8,
            $9,
            FALSE,
            $10
          )
        `,
        [
          usuarioId,
          origenId,
          gasto.categoriaId,
          gasto.fecha,
          meses,
          gasto.descripcion,
          gasto.monto,
          cuota,
          gasto.cuotasTotales,
          gasto.observaciones,
        ]
      );

      creadas++;
    }
  }

  return creadas;
};

// Carga en los meses siguientes las cuotas que faltan de los gastos en
// cuotas del mes indicado (para gastos guardados antes de que existiera
// la carga automática). No duplica las que ya están.
export const cargarCuotasSiguientes = async (
  usuarioId,
  origenId,
  anio,
  mes
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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

    const { rows } = await client.query(
      `
        SELECT
          TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
          descripcion,
          monto,
          categoria_id,
          cuota_actual,
          cuotas_totales,
          observaciones
        FROM gastos
        WHERE origen_id = $1
          AND usuario_id = $2
          AND cuota_actual < cuotas_totales
          AND fecha >= MAKE_DATE($3, $4, 1)
          AND fecha < MAKE_DATE($3, $4, 1) + INTERVAL '1 month'
        ORDER BY fecha, id
      `,
      [origenId, usuarioId, anio, mes]
    );

    const creadas = await crearCuotasFuturas(
      client,
      usuarioId,
      origenId,
      rows.map((fila) => ({
        fecha: fila.fecha,
        descripcion: fila.descripcion,
        monto: Number(fila.monto),
        categoriaId: fila.categoria_id,
        cuotaActual: fila.cuota_actual,
        cuotasTotales: fila.cuotas_totales,
        observaciones: fila.observaciones,
      }))
    );

    await client.query("COMMIT");

    return {
      gastosEnCuotas: rows.length,
      cuotasFuturas: creadas,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};

export const obtenerVencimiento = async (
  usuarioId,
  origenId,
  anio,
  mes
) => {
  const { rows } = await pool.query(
    `
      SELECT TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
      FROM vencimientos
      WHERE usuario_id = $1
        AND origen_id = $2
        AND anio = $3
        AND mes = $4
    `,
    [usuarioId, origenId, anio, mes]
  );

  return rows[0]?.fecha || null;
};

// Guarda (o borra, si la fecha es null) el vencimiento del mes.
const guardarVencimiento = async (
  client,
  usuarioId,
  origenId,
  { anio, mes, fecha }
) => {
  if (!fecha) {
    await client.query(
      `
        DELETE FROM vencimientos
        WHERE usuario_id = $1
          AND origen_id = $2
          AND anio = $3
          AND mes = $4
      `,
      [usuarioId, origenId, anio, mes]
    );

    return;
  }

  await client.query(
    `
      INSERT INTO vencimientos (usuario_id, origen_id, anio, mes, fecha)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, origen_id, anio, mes)
      DO UPDATE SET fecha = EXCLUDED.fecha
    `,
    [usuarioId, origenId, anio, mes, fecha]
  );
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
    vencimiento = null,
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

    const cuotasFuturas = await crearCuotasFuturas(
      client,
      usuarioId,
      origenId,
      crear
    );

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
    // VENCIMIENTO DEL MES (si vino)
    // ============================

    if (vencimiento) {
      await guardarVencimiento(
        client,
        usuarioId,
        origenId,
        vencimiento
      );
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
      cuotasFuturas,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};