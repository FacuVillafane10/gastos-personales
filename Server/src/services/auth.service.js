import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  randomBytes,
  createHash,
} from "node:crypto";

import {
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  crearUsuario,
  buscarCredencialesUsuarioPorId,
  actualizarPasswordUsuario,
} from "../repositories/usuario.repository.js";

import {
  eliminarTokensUsuario,
  crearTokenRecuperacion,
  buscarTokenRecuperacion,
} from "../repositories/passwordReset.repository.js";

// ===================================
// REGISTRAR USUARIO
// ===================================

export const registrarUsuario = async (
  nombre,
  email,
  password
) => {
  if (
    typeof nombre !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !nombre.trim() ||
    !email.trim() ||
    !password
  ) {
    throw new Error(
      "Nombre, email y contraseña son obligatorios"
    );
  }

  if (password.length < 6) {
    throw new Error(
      "La contraseña debe tener al menos 6 caracteres"
    );
  }

  const nombreNormalizado =
    nombre.trim();

  const emailNormalizado = email
    .trim()
    .toLowerCase();

  const usuarioExistente =
    await buscarUsuarioPorEmail(
      emailNormalizado
    );

  if (usuarioExistente) {
    throw new Error(
      "Ya existe una cuenta con ese email"
    );
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12
    );

  const usuario =
    await crearUsuario({
      nombre: nombreNormalizado,
      email: emailNormalizado,
      passwordHash,
    });

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
  };
};


// ===================================
// INICIAR SESIÓN
// ===================================

export const iniciarSesion = async (
  email,
  password
) => {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    throw new Error(
      "Email y contraseña son obligatorios"
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET no está configurado"
    );
  }

  const emailNormalizado = email
    .trim()
    .toLowerCase();

  const usuario =
    await buscarUsuarioPorEmail(
      emailNormalizado
    );

  if (!usuario || !usuario.activo) {
    throw new Error(
      "Email o contraseña incorrectos"
    );
  }

  const passwordCorrecto =
    await bcrypt.compare(
      password,
      usuario.password_hash
    );

  if (!passwordCorrecto) {
    throw new Error(
      "Email o contraseña incorrectos"
    );
  }

  const token = jwt.sign(
    {},
    process.env.JWT_SECRET,
    {
      subject: String(usuario.id),
      expiresIn: "8h",
      algorithm: "HS256",
    }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
    },
  };
};


// ===================================
// USUARIO ACTUAL
// ===================================

export const obtenerUsuarioActual =
  async (usuarioId) => {
    return await buscarUsuarioPorId(
      usuarioId
    );
  };

  export const cambiarPassword = async (
  usuarioId,
  passwordActual,
  passwordNueva
) => {
  if (
    typeof passwordActual !== "string" ||
    typeof passwordNueva !== "string" ||
    !passwordActual ||
    !passwordNueva
  ) {
    throw new Error(
      "La contraseña actual y la nueva son obligatorias"
    );
  }

  if (passwordNueva.length < 6) {
    throw new Error(
      "La nueva contraseña debe tener al menos 6 caracteres"
    );
  }

  if (passwordActual === passwordNueva) {
    throw new Error(
      "La nueva contraseña debe ser diferente de la actual"
    );
  }

  const usuario =
    await buscarCredencialesUsuarioPorId(
      usuarioId
    );

  if (!usuario || !usuario.activo) {
    throw new Error(
      "Usuario inválido"
    );
  }

  const passwordCorrecto =
    await bcrypt.compare(
      passwordActual,
      usuario.password_hash
    );

  if (!passwordCorrecto) {
    throw new Error(
      "La contraseña actual es incorrecta"
    );
  }

  const passwordHash =
    await bcrypt.hash(
      passwordNueva,
      12
    );

  await actualizarPasswordUsuario(
    usuarioId,
    passwordHash
  );

  return {
    message:
      "Contraseña actualizada correctamente",
  };
};

// ===================================
// SOLICITAR RECUPERACIÓN DE CONTRASEÑA
// ===================================

// ===================================
// SOLICITAR RECUPERACIÓN DE CONTRASEÑA
// ===================================

export const solicitarRecuperacionPassword =
  async (email) => {
    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      throw new Error(
        "El email es obligatorio"
      );
    }

    const emailNormalizado = email
      .trim()
      .toLowerCase();

    const usuario =
      await buscarUsuarioPorEmail(
        emailNormalizado
      );

    // No revelamos si el email existe
    if (!usuario || !usuario.activo) {
      return {
        token: null,
        usuario: null,
      };
    }

    // Eliminamos tokens anteriores
    await eliminarTokensUsuario(
      usuario.id
    );

    // Token real
    const token = randomBytes(32)
      .toString("hex");

    // Guardamos solamente el hash
    const tokenHash = createHash(
      "sha256"
    )
      .update(token)
      .digest("hex");

    // Válido durante 30 minutos
    const expiraEn = new Date(
      Date.now() +
        30 * 60 * 1000
    );

    await crearTokenRecuperacion({
      usuarioId: usuario.id,
      tokenHash,
      expiraEn,
    });

    return {
      token,

      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
      },
    };
  };

  // ===================================
// RESTABLECER CONTRASEÑA
// ===================================

export const restablecerPassword =
  async (
    token,
    passwordNueva
  ) => {
    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      throw new Error(
        "El enlace de recuperación es inválido"
      );
    }

    if (
      typeof passwordNueva !==
        "string" ||
      passwordNueva.length < 6
    ) {
      throw new Error(
        "La nueva contraseña debe tener al menos 6 caracteres"
      );
    }

    const tokenHash = createHash(
      "sha256"
    )
      .update(token)
      .digest("hex");

    const tokenRecuperacion =
      await buscarTokenRecuperacion(
        tokenHash
      );

    if (!tokenRecuperacion) {
      throw new Error(
        "El enlace de recuperación es inválido o venció"
      );
    }

    const passwordHash =
      await bcrypt.hash(
        passwordNueva,
        12
      );

    await actualizarPasswordUsuario(
      tokenRecuperacion.usuario_id,
      passwordHash
    );

    // Al utilizar el enlace eliminamos
    // todos los tokens del usuario
    await eliminarTokensUsuario(
      tokenRecuperacion.usuario_id
    );

    return {
      message:
        "Contraseña restablecida correctamente",
    };
  };