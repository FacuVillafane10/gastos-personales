import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";

import pool from "./database/db.js";

import authRoutes from "./routes/auth.routes.js";
import origenRoutes from "./routes/origen.routes.js";
import resumenRoutes from "./routes/resumen.routes.js";
import gastoRoutes from "./routes/gasto.routes.js";
import categoriaRoutes from "./routes/categoria.routes.js";

import {
  requerirAutenticacion,
} from "./middlewares/auth.middleware.js";

const app = express();

const PORT = process.env.PORT || 3000;


// ==============================
// MIDDLEWARES GENERALES
// ==============================

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
  try {
    const result = await pool.query(
      "SELECT current_database()"
    );

    console.log(
      `✅ PostgreSQL conectado a: ${result.rows[0].current_database}`
    );

    app.listen(PORT, () => {
      console.log(
        `🚀 Servidor funcionando en http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "❌ Error al conectar con PostgreSQL:"
    );

    console.error(error.message);

    process.exit(1);
  }
};

iniciarServidor();