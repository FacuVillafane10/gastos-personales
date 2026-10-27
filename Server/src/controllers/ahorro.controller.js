import {
  guardarCambios,
  listarAhorrosMensuales,
} from "../services/ahorro.service.js";

export const getAhorros = async (req, res) => {
  try {
    const { anio, mes } = req.query;

    const resultado =
      await listarAhorrosMensuales(
        req.usuario.id,
        anio,
        mes
      );

    res.json(resultado);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};

export const postCambiosAhorros = async (
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
