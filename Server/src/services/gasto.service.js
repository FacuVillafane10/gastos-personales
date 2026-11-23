import {
  cargarCuotasSiguientes,
  obtenerGastosMensuales,
  obtenerVencimiento,
  obtenerCategoriasSugeridas,
  guardarCambiosGastos,
} from "../repositories/gasto.repository.js";
import { generarFijos } from "../repositories/gastoFijo.repository.js";

const validarOrigenId = (origenId) => {
  const id = Number(origenId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("El origen es inválido");
  }

  return id;
};

const validarPeriodo = (anio, mes) => {
  const anioNumero = Number(anio);
  const mesNumero = Number(mes);

  if (!Number.isInteger(anioNumero)) {
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

const normalizarGasto = (gasto, requiereId = false) => {
  let id;

  if (requiereId) {
    id = Number(gasto.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("El ID del gasto es inválido");
    }
  }

  const descripcion = gasto.descripcion?.trim();

  if (!descripcion) {
    throw new Error("La descripción es obligatoria");
  }

  if (descripcion.length > 255) {
    throw new Error(
      "La descripción no puede superar los 255 caracteres"
    );
  }

  const monto = Number(gasto.monto);

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto debe ser mayor a cero");
  }

  let cuotaActual = null;
let cuotasTotales = null;

const tieneCuotaActual =
  gasto.cuotaActual !== "" &&
  gasto.cuotaActual !== null &&
  gasto.cuotaActual !== undefined;

const tieneCuotasTotales =
  gasto.cuotasTotales !== "" &&
  gasto.cuotasTotales !== null &&
  gasto.cuotasTotales !== undefined;

if (tieneCuotaActual || tieneCuotasTotales) {
  cuotaActual = Number(gasto.cuotaActual);
  cuotasTotales = Number(gasto.cuotasTotales);

  if (
    !Number.isInteger(cuotaActual) ||
    !Number.isInteger(cuotasTotales) ||
    cuotaActual <= 0 ||
    cuotasTotales <= 0
  ) {
    throw new Error(
      "Las cuotas deben ser números enteros mayores a cero"
    );
  }

  if (cuotaActual > cuotasTotales) {
    throw new Error(
      "La cuota actual no puede ser mayor al total de cuotas"
    );
  }
}

  if (!gasto.fecha) {
    throw new Error("La fecha es obligatoria");
  }

  let categoriaId = null;

  if (gasto.categoriaId) {
    categoriaId = Number(gasto.categoriaId);

    if (
      !Number.isInteger(categoriaId) ||
      categoriaId <= 0
    ) {
      throw new Error("La categoría es inválida");
    }
  }

const observaciones =
    typeof gasto.observaciones === "string"
      ? gasto.observaciones.trim()
      : "";

  if (observaciones.length > 1000) {
    throw new Error(
      "Las observaciones no pueden superar los 1000 caracteres"
    );
  }

return {
    ...(requiereId && { id }),

    fecha: gasto.fecha,
    descripcion,
    monto,
    categoriaId,

    cuotaActual,
    cuotasTotales,

    pagado: gasto.pagado === true,

    // Se repite todos los meses (no aplica a compras en cuotas).
    // null = no cambia.
    fijo:
      cuotaActual !== null || typeof gasto.fijo !== "boolean"
        ? null
        : gasto.fijo,

    // Plantilla a la que pertenece (ej. al reemplazarlo con el resumen)
    gastoFijoId:
      cuotaActual === null &&
      Number.isInteger(Number(gasto.gastoFijoId)) &&
      Number(gasto.gastoFijoId) > 0
        ? Number(gasto.gastoFijoId)
        : null,

    observaciones: observaciones || null,
  };
};

export const listarGastosMensuales = async (
  usuarioId,
  origenId,
  anio,
  mes
) => {
  const id = validarOrigenId(origenId);

  const periodo = validarPeriodo(anio, mes);

  // Al abrir el mes se cargan los gastos fijos que falten.
  await generarFijos(
    usuarioId,
    periodo.anio,
    periodo.mes,
    id
  );

  const gastos = await obtenerGastosMensuales(
    usuarioId,
    id,
    periodo.anio,
    periodo.mes
  );

  return gastos.map((gasto) => ({
    ...gasto,
    monto: Number(gasto.monto),
  }));
};

export const generarCuotasSiguientes = async (
  usuarioId,
  origenId,
  anio,
  mes
) => {
  const id = validarOrigenId(origenId);

  const periodo = validarPeriodo(anio, mes);

  return await cargarCuotasSiguientes(
    usuarioId,
    id,
    periodo.anio,
    periodo.mes
  );
};

export const listarCategoriasSugeridas = async (usuarioId) =>
  await obtenerCategoriasSugeridas(usuarioId);

export const consultarVencimiento = async (
  usuarioId,
  origenId,
  anio,
  mes
) => {
  const id = validarOrigenId(origenId);

  const periodo = validarPeriodo(anio, mes);

  return await obtenerVencimiento(
    usuarioId,
    id,
    periodo.anio,
    periodo.mes
  );
};

// { anio, mes, fecha }: fecha "AAAA-MM-DD" o null para borrarla.
const normalizarVencimiento = (vencimiento) => {
  if (!vencimiento) return null;

  const periodo = validarPeriodo(
    vencimiento.anio,
    vencimiento.mes
  );

  const fecha = vencimiento.fecha || null;

  if (
    fecha !== null &&
    (typeof fecha !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      Number.isNaN(Date.parse(fecha)))
  ) {
    throw new Error("La fecha de vencimiento es inválida");
  }

  return { ...periodo, fecha };
};

export const guardarCambios = async (
  usuarioId,
  origenId,
  cambios
) => {
  const id = validarOrigenId(origenId);

  const crear = (cambios.crear || []).map((gasto) =>
    normalizarGasto(gasto)
  );

  const actualizar = (cambios.actualizar || []).map(
    (gasto) => normalizarGasto(gasto, true)
  );

  const eliminar = (cambios.eliminar || []).map(
    (gastoId) => {
      const gastoIdNumero = Number(gastoId);

      if (
        !Number.isInteger(gastoIdNumero) ||
        gastoIdNumero <= 0
      ) {
        throw new Error(
          "Existe un ID inválido para eliminar"
        );
      }

      return gastoIdNumero;
    }
  );

  return await guardarCambiosGastos(
    usuarioId,
    id, {
    crear,
    actualizar,
    eliminar,
    vencimiento: normalizarVencimiento(
      cambios.vencimiento
    ),
  });
};