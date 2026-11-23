import {
  actualizarRegla,
  borrarRegla,
  categoriaDelUsuario,
  crearRegla,
  obtenerReglas,
} from "../repositories/regla.repository.js";

// El patrón se guarda en mayúsculas y con espacios simples, igual que
// se compara en el cliente.
export const normalizarPatron = (texto) =>
  String(texto || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const validarId = (id) => {
  const numero = Number(id);

  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error("La regla es inválida");
  }

  return numero;
};

const normalizarRegla = async (usuarioId, datos = {}) => {
  const patron = normalizarPatron(datos.patron);

  if (!patron) {
    throw new Error("Indicá con qué empieza la descripción");
  }

  if (patron.length > 100) {
    throw new Error(
      "El texto a buscar no puede superar los 100 caracteres"
    );
  }

  const nombre =
    typeof datos.nombre === "string"
      ? datos.nombre.replace(/\s+/g, " ").trim()
      : "";

  if (nombre.length > 255) {
    throw new Error(
      "El nombre no puede superar los 255 caracteres"
    );
  }

  let categoriaId = null;

  if (datos.categoriaId) {
    categoriaId = Number(datos.categoriaId);

    if (
      !Number.isInteger(categoriaId) ||
      categoriaId <= 0 ||
      !(await categoriaDelUsuario(usuarioId, categoriaId))
    ) {
      throw new Error("La categoría es inválida");
    }
  }

  if (!nombre && !categoriaId) {
    throw new Error("Poné un nombre, una categoría o las dos");
  }

  return {
    patron,
    nombre: nombre || null,
    categoriaId,
  };
};

export const listarReglas = async (usuarioId) =>
  await obtenerReglas(usuarioId);

export const agregarRegla = async (usuarioId, datos) =>
  await crearRegla(
    usuarioId,
    await normalizarRegla(usuarioId, datos)
  );

export const editarRegla = async (usuarioId, id, datos) => {
  const regla = await actualizarRegla(
    usuarioId,
    validarId(id),
    await normalizarRegla(usuarioId, datos)
  );

  if (!regla) {
    throw new Error("Regla no encontrada");
  }

  return regla;
};

export const eliminarRegla = async (usuarioId, id) => {
  const borrada = await borrarRegla(usuarioId, validarId(id));

  if (!borrada) {
    throw new Error("Regla no encontrada");
  }
};
