import {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  desactivarCategoria,
} from "../repositories/categoria.repository.js";

export const listarCategorias = async (
  usuarioId
) => {
  return await obtenerCategorias(
    usuarioId
  );
};

export const buscarCategoria = async (
  usuarioId,
  id
) => {
  const categoria =
    await obtenerCategoriaPorId(
      usuarioId,
      id
    );

  if (!categoria) {
    throw new Error(
      "Categoría no encontrada"
    );
  }

  return categoria;
};

export const agregarCategoria = async (
  usuarioId,
  nombre
) => {
  const nombreLimpio =
    nombre?.trim();

  if (!nombreLimpio) {
    throw new Error(
      "El nombre es obligatorio"
    );
  }

  if (nombreLimpio.length > 100) {
    throw new Error(
      "El nombre no puede superar los 100 caracteres"
    );
  }

  return await crearCategoria(
    usuarioId,
    nombreLimpio
  );
};

export const editarCategoria = async (
  usuarioId,
  id,
  nombre
) => {
  const nombreLimpio =
    nombre?.trim();

  if (!nombreLimpio) {
    throw new Error(
      "El nombre es obligatorio"
    );
  }

  if (nombreLimpio.length > 100) {
    throw new Error(
      "El nombre no puede superar los 100 caracteres"
    );
  }

  const categoria =
    await actualizarCategoria(
      usuarioId,
      id,
      nombreLimpio
    );

  if (!categoria) {
    throw new Error(
      "Categoría no encontrada"
    );
  }

  return categoria;
};

export const eliminarCategoria = async (
  usuarioId,
  id
) => {
  const categoria =
    await desactivarCategoria(
      usuarioId,
      id
    );

  if (!categoria) {
    throw new Error(
      "Categoría no encontrada"
    );
  }

  return categoria;
};