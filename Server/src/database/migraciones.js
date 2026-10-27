import pool from "./db.js";

// Crea las tablas que se agregaron después de la versión inicial.
// Es idempotente: se puede ejecutar en cada arranque.

const claveUsuario = (conClaveForanea) =>
  conClaveForanea
    ? "REFERENCES usuarios(id) ON DELETE CASCADE"
    : "";

const TABLAS = [
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

export const ejecutarMigraciones = async () => {
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
