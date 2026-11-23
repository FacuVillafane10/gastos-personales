import {
  agregarRegla,
  editarRegla,
  eliminarRegla,
  listarReglas,
} from "../services/regla.service.js";

const responderError = (res, error) => {
  if (error.code === "23505") {
    return res.status(409).json({
      error: "Ya existe una regla para ese texto",
    });
  }

  res.status(400).json({
    error: error.message,
  });
};

export const getReglas = async (req, res) => {
  try {
    res.json(await listarReglas(req.usuario.id));
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

export const postRegla = async (req, res) => {
  try {
    const regla = await agregarRegla(
      req.usuario.id,
      req.body
    );

    res.status(201).json(regla);
  } catch (error) {
    responderError(res, error);
  }
};

export const putRegla = async (req, res) => {
  try {
    const regla = await editarRegla(
      req.usuario.id,
      req.params.id,
      req.body
    );

    res.json(regla);
  } catch (error) {
    responderError(res, error);
  }
};

export const deleteRegla = async (req, res) => {
  try {
    await eliminarRegla(req.usuario.id, req.params.id);

    res.json({
      message: "Regla eliminada",
    });
  } catch (error) {
    responderError(res, error);
  }
};
