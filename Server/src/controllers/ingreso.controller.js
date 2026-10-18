import {
  listarIngresosMensuales,
  guardarCambios,
} from "../services/ingreso.service.js";

export const getIngresos = async (req, res) => {
  try {
    const { anio, mes } = req.query;

    const ingresos =
      await listarIngresosMensuales(
        req.usuario.id,
        anio,
        mes
      );

    res.json(ingresos);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};

export const postCambiosIngresos = async (
  req,
  res
) => {
  try {
    const resultado = await guardarCambios(
      req.usuario.id,
      req.body
    );

    res.json({
      message: "Cambios guardados correctamente",
      ...resultado,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};
