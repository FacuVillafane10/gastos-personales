import pool from "./db.js";

// Crea las tablas que se agregaron después de la versión inicial.
// Es idempotente: se puede ejecutar en cada arranque.

const claveUsuario = (conClaveForanea) =>
  conClaveForanea
    ? "REFERENCES usuarios(id) ON DELETE CASCADE"
    : "";

const claveOrigen = (conClaveForanea) =>
  conClaveForanea
    ? "REFERENCES origenes_gasto(id) ON DELETE CASCADE"
    : "";

const claveCategoria = (conClaveForanea) =>
  conClaveForanea
    ? "REFERENCES categorias(id) ON DELETE SET NULL"
    : "";

const TABLAS = [
  {
    // Fecha de vencimiento del resumen de un origen en un mes (ej. la
    // tarjeta vence el 11/11). Se toma del PDF o se carga a mano.
    nombre: "vencimientos",

    sql: (conClaveForanea) => `
      CREATE TABLE IF NOT EXISTS vencimientos (
        id         SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL ${claveUsuario(conClaveForanea)},
        origen_id  INTEGER NOT NULL ${claveOrigen(conClaveForanea)},
        anio       INTEGER NOT NULL,
        mes        INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
        fecha      DATE NOT NULL,
        UNIQUE (usuario_id, origen_id, anio, mes)
      );
    `,
  },

  {
    // "Si la descripción del banco empieza con PATRON → nombre y
    // categoría" (se aplica al importar resúmenes).
    nombre: "reglas_descripcion",

    sql: (conClaveForanea) => `
      CREATE TABLE IF NOT EXISTS reglas_descripcion (
        id           SERIAL PRIMARY KEY,
        usuario_id   INTEGER NOT NULL ${claveUsuario(conClaveForanea)},
        patron       VARCHAR(100) NOT NULL,
        nombre       VARCHAR(255),
        categoria_id INTEGER ${claveCategoria(conClaveForanea)},
        creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (usuario_id, patron)
      );
    `,
  },

  {
    nombre: "ingresos",

    sql: (conClaveForanea) => `
      CREATE TABLE IF NOT EXISTS ingresos (
        id             SERIAL PRIMARY KEY,
        usuario_id     INTEGER NOT NULL ${claveUsuario(conClaveForanea)},
        fecha          DATE NOT NULL,
        descripcion    VARCHAR(255) NOT NULL,
        monto          NUMERIC(14,2) NOT NULL CHECK (monto > 0),
        observaciones  TEXT,
        creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ingresos_usuario_fecha
        ON ingresos(usuario_id, fecha);
    `,
  },

  {
    // Depósitos, retiros y compras de dólares, en pesos o dólares.
    // En una compra: monto = dólares obtenidos, monto_pesos = pesos pagados.
    nombre: "ahorros",

    sql: (conClaveForanea) => `
      CREATE TABLE IF NOT EXISTS ahorros (
        id             SERIAL PRIMARY KEY,
        usuario_id     INTEGER NOT NULL ${claveUsuario(conClaveForanea)},
        fecha          DATE NOT NULL,
        tipo           VARCHAR(10) NOT NULL,
        moneda         CHAR(3) NOT NULL
          CHECK (moneda IN ('ARS', 'USD')),
        descripcion    VARCHAR(255) NOT NULL,
        monto          NUMERIC(14,2) NOT NULL CHECK (monto > 0),
        monto_pesos    NUMERIC(14,2),
        observaciones  TEXT,
        creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ahorros_usuario_fecha
        ON ahorros(usuario_id, fecha);

      -- Para tablas creadas antes de existir la compra de dólares
      ALTER TABLE ahorros
        ADD COLUMN IF NOT EXISTS monto_pesos NUMERIC(14,2);

      ALTER TABLE ahorros
        DROP CONSTRAINT IF EXISTS ahorros_tipo_check;

      ALTER TABLE ahorros
        ADD CONSTRAINT ahorros_tipo_check
        CHECK (tipo IN ('deposito', 'retiro', 'compra_usd'));

      ALTER TABLE ahorros
        DROP CONSTRAINT IF EXISTS ahorros_compra_check;

      ALTER TABLE ahorros
        ADD CONSTRAINT ahorros_compra_check
        CHECK (
          (tipo = 'compra_usd' AND moneda = 'USD' AND monto_pesos > 0)
          OR (tipo <> 'compra_usd' AND monto_pesos IS NULL)
        );
    `,
  },
];

// El nombre de un origen o categoría debe ser único por usuario, no entre
// todos los usuarios. Algunas bases tenían UNIQUE(nombre) global: se quita
// y se deja UNIQUE(usuario_id, nombre).
const sqlUnicidadPorUsuario = (tabla) => `
  DO $$
  DECLARE
    fila record;
    col_nombre smallint;
    col_usuario smallint;
  BEGIN
    SELECT attnum INTO col_nombre
    FROM pg_attribute
    WHERE attrelid = '${tabla}'::regclass AND attname = 'nombre';

    SELECT attnum INTO col_usuario
    FROM pg_attribute
    WHERE attrelid = '${tabla}'::regclass AND attname = 'usuario_id';

    -- Restricciones UNIQUE solo sobre "nombre"
    FOR fila IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = '${tabla}'::regclass
        AND contype = 'u'
        AND conkey = ARRAY[col_nombre]
    LOOP
      EXECUTE format(
        'ALTER TABLE ${tabla} DROP CONSTRAINT %I',
        fila.conname
      );
    END LOOP;

    -- Índices únicos sueltos solo sobre "nombre"
    FOR fila IN
      SELECT i.indexrelid::regclass::text AS indice
      FROM pg_index i
      WHERE i.indrelid = '${tabla}'::regclass
        AND i.indisunique
        AND NOT i.indisprimary
        AND i.indnatts = 1
        AND i.indkey[0] = col_nombre
        AND NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          WHERE c.conindid = i.indexrelid
        )
    LOOP
      EXECUTE format('DROP INDEX %s', fila.indice);
    END LOOP;

    -- Unicidad por usuario, si todavía no existe
    IF NOT EXISTS (
      SELECT 1
      FROM pg_index i
      WHERE i.indrelid = '${tabla}'::regclass
        AND i.indisunique
        AND i.indnatts = 2
        AND (
          (i.indkey[0] = col_usuario AND i.indkey[1] = col_nombre)
          OR (i.indkey[0] = col_nombre AND i.indkey[1] = col_usuario)
        )
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_${tabla}_usuario_nombre
        ON ${tabla} (usuario_id, nombre)';
    END IF;
  END $$;
`;

const corregirUnicidad = async () => {
  for (const tabla of ["origenes_gasto", "categorias"]) {
    try {
      await pool.query(sqlUnicidadPorUsuario(tabla));
    } catch (error) {
      console.error(
        `❌ No se pudo ajustar la unicidad de ${tabla}:`,
        error.message
      );
    }
  }
};

// Columnas que se agregaron a tablas que ya existían.
const COLUMNAS = [
  {
    // Si el gasto ya se pagó (tilde en Movimientos)
    nombre: "gastos.pagado",

    sql: `
      ALTER TABLE gastos
        ADD COLUMN IF NOT EXISTS pagado BOOLEAN NOT NULL DEFAULT FALSE;
    `,
  },
];

const agregarColumnas = async () => {
  for (const columna of COLUMNAS) {
    try {
      await pool.query(columna.sql);
    } catch (error) {
      console.error(
        `❌ No se pudo agregar la columna ${columna.nombre}:`,
        error.message
      );
    }
  }
};

export const ejecutarMigraciones = async () => {
  await corregirUnicidad();

  await agregarColumnas();

  for (const tabla of TABLAS) {
    try {
      await pool.query(tabla.sql(true));
    } catch (error) {
      console.error(
        `⚠️ No se pudo crear la tabla ${tabla.nombre} con clave foránea:`,
        error.message
      );

      try {
        await pool.query(tabla.sql(false));
      } catch (errorSinClave) {
        console.error(
          `❌ No se pudo crear la tabla ${tabla.nombre}:`,
          errorSinClave.message
        );
      }
    }
  }
};
