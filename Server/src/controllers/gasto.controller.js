import {
  consultarVencimiento,
  generarCuotasSiguientes,
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

export const getVencimiento = async (req, res) => {
  try {
    const { origenId, anio, mes } = req.query;

    const fecha = await consultarVencimiento(
      req.usuario.id,
      origenId,
      anio,
      mes
    );

    res.json({ fecha });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};

export const postCuotasSiguientes = async (
  req,
  res
) => {
  try {
    const { origenId, anio, mes } = req.body;

    const resultado = await generarCuotasSiguientes(
      req.usuario.id,
      origenId,
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
      vencimiento = null,
    } = req.body;

    const resultado = await guardarCambios(
      req.usuario.id,
      origenId,
      {
        crear,
        actualizar,
        eliminar,
        vencimiento,
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