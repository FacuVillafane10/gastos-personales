import {
  actualizarFijo,
  borrarFijo,
  obtenerFijos,
} from "../repositories/gastoFijo.repository.js";

const validarId = (id) => {
  const numero = Number(id);

  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error("El gasto fijo es inválido");
  }

  return numero;
};

// Mes actual en Argentina (para reanudar desde ahora).
const mesActual = () => {
  const [anio, mes] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);

  return { anio, mes };
};

export const listarFijos = async (usuarioId) =>
  await obtenerFijos(usuarioId);

export const editarFijo = async (usuarioId, id, datos = {}) => {
  const cambios = {};

  if (datos.descripcion !== undefined) {
    const descripcion = String(datos.descripcion).trim();

    if (!descripcion || descripcion.length > 255) {
      throw new Error("La descripción es inválida");
    }

    cambios.descripcion = descripcion;
  }

  if (datos.monto !== undefined) {
    const monto = Number(datos.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      throw new Error("El importe debe ser mayor a cero");
    }

    cambios.monto = monto;
  }

  if (datos.dia !== undefined) {
    const dia = Number(datos.dia);

    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      throw new Error("El día debe estar entre 1 y 31");
    }

    cambios.dia = dia;
  }

  if (datos.activo !== undefined) {
    cambios.activo = datos.activo === true;

    const { anio, mes } = mesActual();

    cambios.desdeAnio = anio;
    cambios.desdeMes = mes;
  }

  const fijo = await actualizarFijo(
    usuarioId,
    validarId(id),
    {
      descripcion: null,
      monto: null,
      dia: null,
      activo: null,
      desdeAnio: null,
      desdeMes: null,
      ...cambios,
    }
  );

  if (!fijo) {
    throw new Error("Gasto fijo no encontrado");
  }

  return fijo;
};

export const eliminarFijo = async (usuarioId, id) => {
  const borrado = await borrarFijo(usuarioId, validarId(id));

  if (!borrado) {
    throw new Error("Gasto fijo no encontrado");
  }
};
