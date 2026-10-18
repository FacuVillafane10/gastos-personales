import rateLimit from "express-rate-limit";

// Detrás de Vercel y Render la IP que ve el servidor es compartida,
// por eso el límite se aplica por email y no por IP.
const clavePorEmail = (req) =>
  typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase().slice(0, 255)
    : "sin-email";

const mensaje = (texto) => ({ error: texto });

// 8 intentos fallidos de login por cuenta cada 15 minutos
export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: clavePorEmail,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: mensaje(
    "Demasiados intentos. Probá de nuevo en unos minutos."
  ),
});

// 5 pedidos de recuperación por cuenta cada 15 minutos
// (también evita llenar de mails la casilla de alguien)
export const limitarRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: clavePorEmail,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: mensaje(
    "Demasiados pedidos. Probá de nuevo en unos minutos."
  ),
});
