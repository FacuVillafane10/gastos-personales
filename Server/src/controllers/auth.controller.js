import {
  iniciarSesion,
  obtenerUsuarioActual,
  registrarUsuario,
  cambiarPassword,
  solicitarRecuperacionPassword,
  restablecerPassword,
} from "../services/auth.service.js";

import {
  enviarEmailRecuperacion,
} from "../services/email.service.js";

const opcionesCookieBase = {
  httpOnly: true,

  secure:
    process.env.NODE_ENV ===
    "production",

  sameSite:
    process.env.NODE_ENV ===
    "production"
      ? "none"
      : "lax",
};


// ===================================
// REGISTRO
// ===================================

export const register = async (
  req,
  res
) => {
  try {
    const {
      nombre,
      email,
      password,
    } = req.body;

    if (
      !nombre ||
      !email ||
      !password
    ) {
      return res
        .status(400)
        .json({
          error:
            "Nombre, email y contraseña son obligatorios",
        });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          error:
            "La contraseña debe tener al menos 6 caracteres",
        });
    }

    const usuario =
      await registrarUsuario(
        nombre,
        email,
        password
      );

    res.status(201).json({
      message:
        "Usuario creado correctamente",
      usuario,
    });

  } catch (error) {
    res.status(
      error.status || 400
    ).json({
      error:
        error.message ||
        "No se pudo crear el usuario",
    });
  }
};


// ===================================
// LOGIN
// ===================================

export const login = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    const {
      token,
      usuario,
    } = await iniciarSesion(
      email,
      password
    );

    res.cookie(
      "session",
      token,
      {
        ...opcionesCookieBase,
        maxAge:
          8 * 60 * 60 * 1000,
      }
    );

    res.json({
      message:
        "Sesión iniciada correctamente",
      usuario,
    });

  } catch (error) {
    res.status(401).json({
      error: error.message,
    });
  }
};


// ===================================
// LOGOUT
// ===================================

export const logout = (
  req,
  res
) => {
  res.clearCookie(
    "session",
    opcionesCookieBase
  );

  res.json({
    message:
      "Sesión cerrada correctamente",
  });
};


// ===================================
// USUARIO ACTUAL
// ===================================

export const me = async (
  req,
  res
) => {
  try {
    const usuario =
      await obtenerUsuarioActual(
        req.usuario.id
      );

    if (
      !usuario ||
      !usuario.activo
    ) {
      return res
        .status(401)
        .json({
          error:
            "Usuario inválido",
        });
    }

    res.json(usuario);

  } catch (error) {
    res.status(500).json({
      error:
        "Error al obtener el usuario",
    });
  }
};

export const changePassword = async (
  req,
  res
) => {
  try {
    const {
      passwordActual,
      passwordNueva,
    } = req.body;

    await cambiarPassword(
      req.usuario.id,
      passwordActual,
      passwordNueva
    );

    // Cerramos la sesión inmediatamente
    // después de cambiar la contraseña
    res.clearCookie(
      "session",
      opcionesCookieBase
    );

    res.json({
      message:
        "Contraseña actualizada correctamente. Iniciá sesión nuevamente.",
    });

  } catch (error) {
    res.status(400).json({
      error:
        error.message ||
        "No se pudo cambiar la contraseña",
    });
  }
};

// ===================================
// OLVIDÉ MI CONTRASEÑA
// ===================================

// ===================================
// OLVIDÉ MI CONTRASEÑA
// ===================================

export const forgotPassword = async (
  req,
  res
) => {
  try {
    const {
      email,
    } = req.body;

    const resultado =
      await solicitarRecuperacionPassword(
        email
      );

    if (
      resultado.token &&
      resultado.usuario
    ) {
      const clientUrl =
        process.env.CLIENT_URL ||
        "http://localhost:5173";

      const link =
        `${clientUrl}/restablecer-password?token=${resultado.token}`;

      console.log(
        "📩 Intentando enviar recuperación a:",
        resultado.usuario.email
      );

      await enviarEmailRecuperacion({
        email:
          resultado.usuario.email,

        nombre:
          resultado.usuario.nombre,

        link,
      });

      console.log(
        "✅ Email de recuperación enviado"
      );
    }

    res.json({
      message:
        "Si existe una cuenta asociada a ese email, recibirás instrucciones para restablecer tu contraseña.",
    });

  } catch (error) {
    console.error(
      "❌ Error al enviar recuperación:"
    );

    console.error(error);

    res.status(500).json({
      error:
        "No se pudo procesar la solicitud",
    });
  }
};

// ===================================
// RESTABLECER CONTRASEÑA
// ===================================

export const resetPassword = async (
  req,
  res
) => {
  try {
    const {
      token,
      passwordNueva,
    } = req.body;

    const resultado =
      await restablecerPassword(
        token,
        passwordNueva
      );

    // Por seguridad eliminamos
    // cualquier sesión existente.
    res.clearCookie(
      "session",
      opcionesCookieBase
    );

    res.json(resultado);

  } catch (error) {
    res.status(400).json({
      error:
        error.message ||
        "No se pudo restablecer la contraseña",
    });
  }
};

