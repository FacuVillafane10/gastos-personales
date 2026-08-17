import {
  listarGastosMensuales,
  guardarCambios,
} from "../services/gasto.service.js";

export const getGastos = async (req, res) => {
  try {
    const {
      origenId,
      anio,
      mes,
    } = req.query;

  const gastos = await listarGastosMensuales(
    req.usuario.id,
    origenId,
    anio,
    mes
  );

    res.json(gastos);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};

export const postCambiosGastos = async (
  req,
  res
) => {
  try {
    const {
      origenId,
      crear = [],
      actualizar = [],
      eliminar = [],
    } = req.body;

    const resultado = await guardarCambios(
      req.usuario.id,
      origenId,
      {
        crear,
        actualizar,
        eliminar,
      }
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