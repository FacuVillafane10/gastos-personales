import {
  obtenerOrigenes,
  obtenerOrigenPorId,
  crearOrigen,
  actualizarOrigen,
  desactivarOrigen,
} from "../repositories/origen.repository.js";

export const listarOrigenes = async (
  usuarioId
) => {
  return await obtenerOrigenes(
    usuarioId
  );
};

export const buscarOrigen = async (
  usuarioId,
  id
) => {
  const origen = await obtenerOrigenPorId(
    usuarioId,
    id
  );

  if (!origen) {
    throw new Error("Origen no encontrado");
  }

  return origen;
};

export const agregarOrigen = async (
  usuarioId,
  nombre
) => {
  const nombreLimpio = nombre?.trim();

  if (!nombreLimpio) {
    throw new Error("El nombre es obligatorio");
  }

  if (nombreLimpio.length > 100) {
    throw new Error(
      "El nombre no puede superar los 100 caracteres"
    );
  }

  return await crearOrigen(
    usuarioId,
    nombreLimpio
  );
};

export const editarOrigen = async (
  usuarioId,
  id,
  nombre
) => {
  const nombreLimpio = nombre?.trim();

  if (!nombreLimpio) {
    throw new Error("El nombre es obligatorio");
  }

  if (nombreLimpio.length > 100) {
    throw new Error(
      "El nombre no puede superar los 100 caracteres"
    );
  }

  const origen = await actualizarOrigen(
    usuarioId,
    id,
    nombreLimpio
  );

  if (!origen) {
    throw new Error("Origen no encontrado");
  }

  return origen;
};

export const eliminarOrigen = async (
  usuarioId,
  id
) => {
  const origen = await desactivarOrigen(
    usuarioId,
    id
  );

  if (!origen) {
    throw new Error("Origen no encontrado");
  }

  return origen;
};