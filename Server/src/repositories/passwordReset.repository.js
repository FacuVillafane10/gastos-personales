import pool from "../database/db.js";


// ===================================
// ELIMINAR TOKENS ANTERIORES
// ===================================

export const eliminarTokensUsuario =
  async (usuarioId) => {
    await pool.query(
      `
        DELETE FROM password_reset_tokens
        WHERE usuario_id = $1
      `,
      [usuarioId]
    );
  };


// ===================================
// CREAR TOKEN
// ===================================

export const crearTokenRecuperacion =
  async ({
    usuarioId,
    tokenHash,
    expiraEn,
  }) => {
    const { rows } =
      await pool.query(
        `
          INSERT INTO password_reset_tokens (
            usuario_id,
            token_hash,
            expira_en
          )
          VALUES ($1, $2, $3)

          RETURNING
            id,
            usuario_id,
            expira_en
        `,
        [
          usuarioId,
          tokenHash,
          expiraEn,
        ]
      );

    return rows[0];
  };


// ===================================
// BUSCAR TOKEN VÁLIDO
// ===================================

export const buscarTokenRecuperacion =
  async (tokenHash) => {
    const { rows } =
      await pool.query(
        `
          SELECT
            id,
            usuario_id,
            token_hash,
            expira_en
          FROM password_reset_tokens
          WHERE token_hash = $1
            AND expira_en > NOW()
          LIMIT 1
        `,
        [tokenHash]
      );

    return rows[0] || null;
  };


// ===================================
// ELIMINAR TOKEN UTILIZADO
// ===================================

export const eliminarTokenRecuperacion =
  async (id) => {
    await pool.query(
      `
        DELETE FROM password_reset_tokens
        WHERE id = $1
      `,
      [id]
    );
  };