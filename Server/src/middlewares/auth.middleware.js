import jwt from "jsonwebtoken";

export const requerirAutenticacion = (
  req,
  res,
  next
) => {
  try {
    const token = req.cookies?.session;

    if (!token) {
      return res.status(401).json({
        error: "No autenticado",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: "JWT_SECRET no está configurado",
      });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    const usuarioId = Number(payload.sub);

    if (
      !Number.isInteger(usuarioId) ||
      usuarioId <= 0
    ) {
      return res.status(401).json({
        error: "Sesión inválida",
      });
    }

    req.usuario = {
      id: usuarioId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Sesión inválida o vencida",
    });
  }
};