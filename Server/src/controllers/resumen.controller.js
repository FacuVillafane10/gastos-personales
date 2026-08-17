import { generarResumenMensual } from "../services/resumen.service.js";

export const getResumenMensual = async (req, res) => {
  try {
    const { anio, mes } = req.query;

    const resumen = await generarResumenMensual(
      req.usuario.id,
      anio,
      mes
    );

    res.json(resumen);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};