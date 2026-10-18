import {
  obtenerIngresosMensuales,
  guardarCambiosIngresos,
} from "../repositories/ingreso.repository.js";

const MAX_CAMBIOS = 500;

const validarPeriodo = (anio, mes) => {
  const anioNumero = Number(anio);
  const mesNumero = Number(mes);

  if (
    !Number.isInteger(anioNumero) ||
    anioNumero < 1900 ||
    anioNumero > 2200
  ) {
    throw new Error("El año es inválido");
  }

  if (
    !Number.isInteger(mesNumero) ||
    mesNumero < 1 ||
    mesNumero > 12
  ) {
    throw new Error("El mes es inválido");
  }

  return {
    anio: anioNumero,
    mes: mesNumero,
  };
};

const fechaValida = (texto) => {
  if (
    typeof texto !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(texto)
  ) {
    return false;
  }

  const [anio, mes, dia] = texto
    .split("-")
    .map(Number);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
};

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
  const {
    crear = [],
    actualizar = [],
    eliminar = [],
  } = cambios || {};

  if (
    !Array.isArray(crear) ||
    !Array.isArray(actualizar) ||
    !Array.isArray(eliminar)
  ) {
    throw new Error("Los cambios son inválidos");
  }

  if (
    crear.length > MAX_CAMBIOS ||
    actualizar.length > MAX_CAMBIOS ||
    eliminar.length > MAX_CAMBIOS
  ) {
    throw new Error(
      `No se pueden guardar más de ${MAX_CAMBIOS} cambios a la vez`
    );
  }

  return await guardarCambiosIngresos(
    usuarioId,
    {
      crear: crear.map((ingreso) =>
        normalizarIngreso(ingreso)
      ),

      actualizar: actualizar.map((ingreso) =>
        normalizarIngreso(ingreso, true)
      ),

      eliminar: eliminar.map((ingresoId) => {
        const numero = Number(ingresoId);

        if (
          !Number.isInteger(numero) ||
          numero <= 0
        ) {
          throw new Error(
            "Existe un ID inválido para eliminar"
          );
        }

        return numero;
      }),
    }
  );
};
