import {
  listarCategorias,
  buscarCategoria,
  agregarCategoria,
  editarCategoria,
  eliminarCategoria,
} from "../services/categoria.service.js";

export const getCategorias = async (req, res) => {
  try {
    const categorias = await listarCategorias(
      req.usuario.id
    );

    res.json(categorias);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

export const getCategoria = async (req, res) => {
  try {
    const categoria = await buscarCategoria(
      req.usuario.id,
      req.params.id
    );

    res.json(categoria);
  } catch (error) {
    res.status(404).json({
      error: error.message,
    });
  }
};

export const postCategoria = async (req, res) => {
  try {
    const { nombre } = req.body || {};

    const categoria = await agregarCategoria(
      req.usuario.id,
      nombre
    );

    res.status(201).json(categoria);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error:
          "Ya existe una categoría con ese nombre",
      });
    }

    res.status(400).json({
      error: error.message,
    });
  }
};

export const putCategoria = async (req, res) => {
  try {
    const { nombre } = req.body;

    const categoria = await editarCategoria(
      req.usuario.id,
      req.params.id,
      nombre
    );

    res.json(categoria);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error:
          "Ya existe una categoría con ese nombre",
      });
    }

    res.status(400).json({
      error: error.message,
    });
  }
};

export const deleteCategoria = async (req, res) => {
  try {
    const categoria = await eliminarCategoria(
      req.usuario.id,
      req.params.id
    );

    res.json({
      message:
        "Categoría desactivada correctamente",
      categoria,
    });
  } catch (error) {
    res.status(404).json({
      error: error.message,
    });
  }
};