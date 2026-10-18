import pool from "./db.js";

// Crea las tablas que se agregaron después de la versión inicial.
// Es idempotente: se puede ejecutar en cada arranque.

const sqlIngresos = (conClaveForanea) => `
  CREATE TABLE IF NOT EXISTS ingresos (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER NOT NULL
      ${
        conClaveForanea
          ? "REFERENCES usuarios(id) ON DELETE CASCADE"
          : ""
      },
    fecha          DATE NOT NULL,
    descripcion    VARCHAR(255) NOT NULL,
    monto          NUMERIC(14,2) NOT NULL CHECK (monto > 0),
    observaciones  TEXT,
    creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_ingresos_usuario_fecha
    ON ingresos(usuario_id, fecha);
`;

export const ejecutarMigraciones = async () => {
  try {
    await pool.query(sqlIngresos(true));
  } catch (error) {
    console.error(
      "⚠️ No se pudo crear la tabla ingresos con clave foránea:",
      error.message
    );

    try {
      await pool.query(sqlIngresos(false));
    } catch (errorSinClave) {
      console.error(
        "❌ No se pudo crear la tabla ingresos:",
        errorSinClave.message
      );
    }
  }
};
