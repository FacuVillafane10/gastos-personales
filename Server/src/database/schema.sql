-- Esquema de Control de Gastos (PostgreSQL)

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expira_en  TIMESTAMP NOT NULL,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);

CREATE TABLE IF NOT EXISTS categorias (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre     VARCHAR(100) NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, nombre)
);

CREATE TABLE IF NOT EXISTS origenes_gasto (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre     VARCHAR(100) NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, nombre)
);

CREATE TABLE IF NOT EXISTS gastos (
  id             SERIAL PRIMARY KEY,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  origen_id      INTEGER NOT NULL REFERENCES origenes_gasto(id),
  categoria_id   INTEGER REFERENCES categorias(id),
  fecha          DATE NOT NULL,
  descripcion    TEXT NOT NULL,
  monto          NUMERIC(14,2) NOT NULL,
  cuota_actual   INTEGER,
  cuotas_totales INTEGER,
  pagado         BOOLEAN NOT NULL DEFAULT FALSE,
  observaciones  TEXT,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gastos_usuario_origen_fecha ON gastos(usuario_id, origen_id, fecha);

-- Ingresos (se crea también automáticamente al iniciar el servidor)
CREATE TABLE IF NOT EXISTS ingresos (
  id             SERIAL PRIMARY KEY,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha          DATE NOT NULL,
  descripcion    VARCHAR(255) NOT NULL,
  monto          NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  observaciones  TEXT,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ingresos_usuario_fecha ON ingresos(usuario_id, fecha);
