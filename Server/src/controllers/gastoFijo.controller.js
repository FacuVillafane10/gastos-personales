import {
  editarFijo,
  eliminarFijo,
  listarFijos,
} from "../services/gastoFijo.service.js";

export const getFijos = async (req, res) => {
  try {
    res.json(await listarFijos(req.usuario.id));
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

export const putFijo = async (req, res) => {
  try {
    res.json(
      await editarFijo(req.usuario.id, req.params.id, req.body)
    );
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};

export const deleteFijo = async (req, res) => {
  try {
    await eliminarFijo(req.usuario.id, req.params.id);

    res.json({
      message: "Gasto fijo eliminado",
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};
