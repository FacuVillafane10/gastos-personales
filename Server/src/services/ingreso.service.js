import {
  obtenerIngresosMensuales,
  guardarCambiosIngresos,
} from "../repositories/ingreso.repository.js";

import {
  fechaValida,
  normalizarLote,
  validarPeriodo,
} from "./validaciones.js";

const normalizarIngreso = (
  ingreso,
  requiereId = false
) => {
  if (!ingreso || typeof ingreso !== "object") {
    throw new Error("El ingreso es inválido");
  }

  let id;

  if (requiereId) {
    id = Number(ingreso.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(
        "El ID del ingreso es inválido"
      );
    }
  }

  const descripcion =
    typeof ingreso.descripcion === "string"
      ? ingreso.descripcion.trim()
      : "";

  if (!descripcion) {
    throw new Error(
      "La descripción es obligatoria"
    );
  }

  if (descripcion.length > 255) {
    throw new Error(
      "La descripción no puede superar los 255 caracteres"
    );
  }

  const monto = Number(ingreso.monto);

  if (
    ingreso.monto === "" ||
    ingreso.monto === null ||
    !Number.isFinite(monto) ||
    monto <= 0
  ) {
    throw new Error(
      "El monto debe ser mayor a cero"
    );
  }

  if (monto >= 1e12) {
    throw new Error("El monto es demasiado grande");
  }

  if (!fechaValida(ingreso.fecha)) {
    throw new Error("La fecha es inválida");
  }

  const observaciones =
    typeof ingreso.observaciones === "string"
      ? ingreso.observaciones.trim()
      : "";

  if (observaciones.length > 1000) {
    throw new Error(
      "Las observaciones no pueden superar los 1000 caracteres"
    );
  }

  return {
    ...(requiereId && { id }),
    fecha: ingreso.fecha,
    descripcion,
    monto,
    observaciones: observaciones || null,
  };
};

export const listarIngresosMensuales = async (
  usuarioId,
  anio,
  mes
) => {
  const periodo = validarPeriodo(anio, mes);

  const ingresos =
    await obtenerIngresosMensuales(
      usuarioId,
      periodo.anio,
      periodo.mes
    );

  return ingresos.map((ingreso) => ({
    ...ingreso,
    monto: Number(ingreso.monto),
  }));
};

export const guardarCambios = async (
  usuarioId,
  cambios
) => {
  return await guardarCambiosIngresos(
    usuarioId,
    normalizarLote(cambios, normalizarIngreso)
  );
};
