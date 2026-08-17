import {
  listarOrigenes,
  buscarOrigen,
  agregarOrigen,
  editarOrigen,
  eliminarOrigen,
} from "../services/origen.service.js";

export const getOrigenes = async (req, res) => {
  try {
    const origenes = await listarOrigenes(
      req.usuario.id
    );

    res.json(origenes);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

export const getOrigen = async (req, res) => {
  try {
    const origen = await buscarOrigen(
      req.usuario.id,
      req.params.id
    );

    res.json(origen);
  } catch (error) {
    res.status(404).json({
      error: error.message,
    });
  }
};

export const postOrigen = async (req, res) => {
  try {
    const { nombre } = req.body;

    const origen = await agregarOrigen(
      req.usuario.id,
      nombre
    );

    res.status(201).json(origen);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Ya existe un origen con ese nombre",
      });
    }

    res.status(400).json({
      error: error.message,
    });
  }
};

export const putOrigen = async (req, res) => {
  try {
    const { nombre } = req.body;

    const origen = await editarOrigen(
      req.usuario.id,
      req.params.id,
      nombre
    );

    res.json(origen);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Ya existe un origen con ese nombre",
      });
    }

    res.status(400).json({
      error: error.message,
    });
  }
};

export const deleteOrigen = async (req, res) => {
  try {
    const origen = await eliminarOrigen(
      req.usuario.id,
      req.params.id
    );

    res.json({
      message: "Origen desactivado correctamente",
      origen,
    });
  } catch (error) {
    res.status(404).json({
      error: error.message,
    });
  }
};