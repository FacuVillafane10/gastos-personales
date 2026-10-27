import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import "dotenv/config";

import pool from "./database/db.js";

import authRoutes from "./routes/auth.routes.js";
import origenRoutes from "./routes/origen.routes.js";
import resumenRoutes from "./routes/resumen.routes.js";
import gastoRoutes from "./routes/gasto.routes.js";
import categoriaRoutes from "./routes/categoria.routes.js";
import ingresoRoutes from "./routes/ingreso.routes.js";
import ahorroRoutes from "./routes/ahorro.routes.js";
import { ejecutarMigraciones } from "./database/migraciones.js";

import {
  requerirAutenticacion,
} from "./middlewares/auth.middleware.js";

const app = express();

const PORT = process.env.PORT || 3000;


// ==============================
// MIDDLEWARES GENERALES
// ==============================

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());


// ==============================
// RUTAS PÚBLICAS
// ==============================

app.use("/api/auth", authRoutes);


// ==============================
// RUTAS PRIVADAS
// ==============================

app.use(
  "/api/origenes",
  requerirAutenticacion,
  origenRoutes
);

app.use(
  "/api/resumen",
  requerirAutenticacion,
  resumenRoutes
);

app.use(
  "/api/gastos",
  requerirAutenticacion,
  gastoRoutes
);

app.use(
  "/api/ingresos",
  requerirAutenticacion,
  ingresoRoutes
);

app.use(
  "/api/ahorros",
  requerirAutenticacion,
  ahorroRoutes
);

app.use(
  "/api/categorias",
  requerirAutenticacion,
  categoriaRoutes
);


// ==============================
// RUTA DE PRUEBA
// ==============================

app.get("/", (req, res) => {
  res.json({
    message: "API de gastos funcionando",
  });
});


// ==============================
// INICIAR SERVIDOR
// ==============================
const iniciarServidor = async () => {
  console.log(
    "DATABASE_URL cargada:",
    Boolean(process.env.DATABASE_URL)
  );

  console.log(
    "NODE_ENV:",
    process.env.NODE_ENV
  );

  if (process.env.DATABASE_URL) {
    try {
      const databaseUrl =
        new URL(
          process.env.DATABASE_URL
        );

      console.log(
        "DB host:",
        databaseUrl.hostname
      );

      console.log(
        "DB database:",
        databaseUrl.pathname.slice(1)
      );
    } catch {
      console.error(
        "❌ DATABASE_URL tiene un formato inválido"
      );
    }
  }

  try {
    const result =
      await pool.query(
        "SELECT current_database()"
      );

    console.log(
      `✅ PostgreSQL conectado a: ${result.rows[0].current_database}`
    );

    await ejecutarMigraciones();

    app.listen(PORT, () => {
      console.log(
        `🚀 Servidor funcionando en puerto ${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "❌ Error al conectar con PostgreSQL:"
    );

    console.error(
      "Nombre:",
      error.name
    );

    console.error(
      "Código:",
      error.code
    );

    console.error(
      "Mensaje:",
      error.message
    );

    process.exit(1);
  }
};

iniciarServidor();