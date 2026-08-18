import pg from "pg";
import "dotenv/config";

const { Pool } = pg;


// ===================================
// CONFIGURACIÓN DE POSTGRESQL
// ===================================

const configuracion =
  process.env.DATABASE_URL
    ? {
        // PRODUCCIÓN - NEON
        connectionString:
          process.env.DATABASE_URL,
      }
    : {
        // DESARROLLO LOCAL
        host:
          process.env.DB_HOST,

        port:
          process.env.DB_PORT
            ? Number(
                process.env.DB_PORT
              )
            : 5432,

        user:
          process.env.DB_USER,

        password:
          process.env.DB_PASSWORD,

        database:
          process.env.DB_NAME,
      };


const pool = new Pool(
  configuracion
);


export default pool;