import pool from "../database/db.js";

// Gastos fijos: una plantilla por gasto que se repite (alquiler,
// Netflix...). Al abrir un mes se carga una vez en ese mes (queda
// registrado en gastos_fijos_generados, así si se borra no vuelve).
// La plantilla toma descripción, importe y categoría del último mes
// cargado.

// Último día del mes como tope (un fijo del 31 cae el 28/02).
const SQL_FECHA_DEL_MES = `
  MAKE_DATE(
    $ANIO,
    $MES,
    LEAST(
      $DIA,
      EXTRACT(
        DAY FROM (MAKE_DATE($ANIO, $MES, 1) + INTERVAL '1 month - 1 day')
      )::INTEGER
    )
  )
`;

// Carga en el mes los fijos activos que falten (de un origen o de
// todos). Devuelve cuántos gastos creó.
export const generarFijosDelMes = async (
  client,
  usuarioId,
  anio,
  mes,
  origenId = null
) => {
  const { rows: fijos } = await client.query(
    `
      SELECT f.*
      FROM gastos_fijos f
      JOIN origenes_gasto o
        ON o.id = f.origen_id
        AND o.usuario_id = $1
        AND o.activo = TRUE
      WHERE f.usuario_id = $1
        AND f.activo = TRUE
        AND f.desde_anio * 12 + f.desde_mes <= $2 * 12 + $3
        AND ($4::INTEGER IS NULL OR f.origen_id = $4)
    `,
    [usuarioId, anio, mes, origenId]
  );

  let creados = 0;

  for (const fijo of fijos) {
    // Si ya se generó este mes (aunque después se haya borrado), no
    // se vuelve a cargar.
    const marca = await client.query(
      `
        INSERT INTO gastos_fijos_generados (gasto_fijo_id, anio, mes)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING gasto_fijo_id
      `,
      [fijo.id, anio, mes]
    );

    if (marca.rowCount === 0) continue;

    await client.query(
      `
        INSERT INTO gastos (
          usuario_id,
          origen_id,
          categoria_id,
          fecha,
          descripcion,
          monto,
          gasto_fijo_id,
          pagado
        )
        VALUES (
          $1,
          $2,
          $3,
          ${SQL_FECHA_DEL_MES
            .replaceAll("$ANIO", "$4")
            .replaceAll("$MES", "$5")
            .replaceAll("$DIA", "$6")},
          $7,
          $8,
          $9,
          FALSE
        )
      `,
      [
        usuarioId,
        fijo.origen_id,
        fijo.categoria_id,
        anio,
        mes,
        fijo.dia,
        fijo.descripcion,
        fijo.monto,
        fijo.id,
      ]
    );

    creados++;
  }

  return creados;
};

// Igual, pero en su propia transacción (al abrir el mes).
export const generarFijos = async (
  usuarioId,
  anio,
  mes,
  origenId = null
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const creados = await generarFijosDelMes(
      client,
      usuarioId,
      anio,
      mes,
      origenId
    );

    await client.query("COMMIT");

    return creados;
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};

const anioMes = (fecha) => ({
  anio: Number(fecha.slice(0, 4)),
  mes: Number(fecha.slice(5, 7)),
  dia: Number(fecha.slice(8, 10)),
});

const marcarGenerado = async (client, fijoId, fecha) => {
  const { anio, mes } = anioMes(fecha);

  await client.query(
    `
      INSERT INTO gastos_fijos_generados (gasto_fijo_id, anio, mes)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `,
    [fijoId, anio, mes]
  );
};

// El gasto más reciente manda: si es de un mes igual o posterior al
// que se usó la última vez, la plantilla toma sus datos.
export const actualizarDesdeGasto = async (
  client,
  fijoId,
  gasto
) => {
  await client.query(
    `
      UPDATE gastos_fijos
      SET descripcion = $2,
          monto = $3,
          categoria_id = $4,
          referencia = $5
      WHERE id = $1
        AND (referencia IS NULL OR referencia <= $5)
    `,
    [
      fijoId,
      gasto.descripcion,
      gasto.monto,
      gasto.categoriaId,
      gasto.fecha,
    ]
  );
};

// Marca un gasto como fijo: lo vincula a una plantilla existente (si
// viene gastoFijoId, ej. al reemplazarlo con el resumen) o crea una
// nueva a partir del gasto. `gasto` trae id, fecha "AAAA-MM-DD",
// descripcion, monto y categoriaId.
export const vincularFijo = async (
  client,
  usuarioId,
  origenId,
  gasto,
  gastoFijoId = null
) => {
  let fijoId = null;

  if (gastoFijoId) {
    const { rows } = await client.query(
      `
        SELECT id
        FROM gastos_fijos
        WHERE id = $1
          AND usuario_id = $2
          AND origen_id = $3
      `,
      [gastoFijoId, usuarioId, origenId]
    );

    fijoId = rows[0]?.id || null;
  }

  if (!fijoId) {
    const { anio, mes, dia } = anioMes(gasto.fecha);

    const { rows } = await client.query(
      `
        INSERT INTO gastos_fijos (
          usuario_id,
          origen_id,
          descripcion,
          monto,
          categoria_id,
          dia,
          desde_anio,
          desde_mes,
          referencia
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        usuarioId,
        origenId,
        gasto.descripcion,
        gasto.monto,
        gasto.categoriaId,
        dia,
        anio,
        mes,
        gasto.fecha,
      ]
    );

    fijoId = rows[0].id;
  } else {
    await actualizarDesdeGasto(client, fijoId, gasto);
  }

  await client.query(
    `
      UPDATE gastos
      SET gasto_fijo_id = $1
      WHERE id = $2
        AND usuario_id = $3
    `,
    [fijoId, gasto.id, usuarioId]
  );

  await marcarGenerado(client, fijoId, gasto.fecha);

  return fijoId;
};

// Deja de repetirse: borra la plantilla. Los gastos ya cargados quedan
// como gastos comunes.
export const quitarFijo = async (client, usuarioId, fijoId) => {
  const { rowCount } = await client.query(
    `
      SELECT 1
      FROM gastos_fijos
      WHERE id = $1
        AND usuario_id = $2
    `,
    [fijoId, usuarioId]
  );

  if (rowCount === 0) return false;

  await client.query(
    "UPDATE gastos SET gasto_fijo_id = NULL WHERE gasto_fijo_id = $1",
    [fijoId]
  );

  await client.query(
    "DELETE FROM gastos_fijos_generados WHERE gasto_fijo_id = $1",
    [fijoId]
  );

  await client.query(
    "DELETE FROM gastos_fijos WHERE id = $1",
    [fijoId]
  );

  return true;
};

// ============================
// ADMINISTRAR
// ============================

const SELECT_FIJO = `
  SELECT
    f.id,
    f.origen_id,
    o.nombre AS origen,
    f.descripcion,
    f.monto,
    f.categoria_id,
    c.nombre AS categoria,
    f.dia,
    f.activo
  FROM gastos_fijos f
  JOIN origenes_gasto o
    ON o.id = f.origen_id
  LEFT JOIN categorias c
    ON c.id = f.categoria_id
`;

export const obtenerFijos = async (usuarioId) => {
  const { rows } = await pool.query(
    `
      ${SELECT_FIJO}
      WHERE f.usuario_id = $1
        AND o.activo = TRUE
      ORDER BY o.nombre, f.descripcion
    `,
    [usuarioId]
  );

  return rows.map((fila) => ({
    ...fila,
    monto: Number(fila.monto),
  }));
};

// Cambia importe, día o descripción, o lo pausa/reanuda. Al reanudar
// empieza desde el mes actual (no rellena los meses en pausa).
export const actualizarFijo = async (
  usuarioId,
  id,
  { descripcion, monto, dia, activo, desdeAnio, desdeMes }
) => {
  const { rows } = await pool.query(
    `
      UPDATE gastos_fijos
      SET descripcion = COALESCE($3, descripcion),
          monto = COALESCE($4, monto),
          dia = COALESCE($5, dia),
          desde_anio = CASE
            WHEN $6::BOOLEAN = TRUE AND activo = FALSE THEN $7
            ELSE desde_anio
          END,
          desde_mes = CASE
            WHEN $6::BOOLEAN = TRUE AND activo = FALSE THEN $8
            ELSE desde_mes
          END,
          activo = COALESCE($6, activo)
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
    `,
    [
      id,
      usuarioId,
      descripcion,
      monto,
      dia,
      activo,
      desdeAnio,
      desdeMes,
    ]
  );

  if (!rows[0]) return null;

  const { rows: [fijo] } = await pool.query(
    `${SELECT_FIJO} WHERE f.id = $1`,
    [id]
  );

  return { ...fijo, monto: Number(fijo.monto) };
};

export const borrarFijo = async (usuarioId, id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const borrado = await quitarFijo(client, usuarioId, id);

    await client.query("COMMIT");

    return borrado;
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};
