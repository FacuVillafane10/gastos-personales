import {
  guardarCambiosAhorros,
  obtenerAhorrosMensuales,
  obtenerTotalesAhorro,
} from "../repositories/ahorro.repository.js";

import {
  fechaValida,
  normalizarLote,
  validarPeriodo,
} from "./validaciones.js";

const TIPOS = ["deposito", "retiro", "compra_usd"];

const MONEDAS = ["ARS", "USD"];

const normalizarAhorro = (
  ahorro,
  requiereId = false
) => {
  if (!ahorro || typeof ahorro !== "object") {
    throw new Error("El ahorro es inválido");
  }

  let id;

  if (requiereId) {
    id = Number(ahorro.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(
        "El ID del ahorro es inválido"
      );
    }
  }

  if (!TIPOS.includes(ahorro.tipo)) {
    throw new Error(
      "El tipo debe ser depósito, retiro o compra de dólares"
    );
  }

  const esCompra = ahorro.tipo === "compra_usd";

  // La compra siempre es en dólares (monto = dólares obtenidos)
  const moneda = esCompra ? "USD" : ahorro.moneda;

  if (!MONEDAS.includes(moneda)) {
    throw new Error(
      "La moneda debe ser pesos o dólares"
    );
  }

  const descripcion =
    typeof ahorro.descripcion === "string"
      ? ahorro.descripcion.trim()
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

  const monto = Number(ahorro.monto);

  if (
    ahorro.monto === "" ||
    ahorro.monto === null ||
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

  let montoPesos = null;

  if (esCompra) {
    montoPesos = Number(ahorro.montoPesos);

    if (
      ahorro.montoPesos === "" ||
      ahorro.montoPesos === null ||
      !Number.isFinite(montoPesos) ||
      montoPesos <= 0
    ) {
      throw new Error(
        "En una compra de dólares, los pesos pagados deben ser mayores a cero"
      );
    }

    if (montoPesos >= 1e12) {
      throw new Error(
        "Los pesos pagados son demasiado grandes"
      );
    }
  }

  if (!fechaValida(ahorro.fecha)) {
    throw new Error("La fecha es inválida");
  }

  const observaciones =
    typeof ahorro.observaciones === "string"
      ? ahorro.observaciones.trim()
      : "";

  if (observaciones.length > 1000) {
    throw new Error(
      "Las observaciones no pueden superar los 1000 caracteres"
    );
  }

  return {
    ...(requiereId && { id }),
    fecha: ahorro.fecha,
    tipo: ahorro.tipo,
    moneda,
    descripcion,
    monto,
    montoPesos,
    observaciones: observaciones || null,
  };
};

export const listarAhorrosMensuales = async (
  usuarioId,
  anio,
  mes
) => {
  const periodo = validarPeriodo(anio, mes);

  const [movimientos, totales] =
    await Promise.all([
      obtenerAhorrosMensuales(
        usuarioId,
        periodo.anio,
        periodo.mes
      ),

      obtenerTotalesAhorro(
        usuarioId,
        periodo.anio,
        periodo.mes
      ),
    ]);

  return {
    movimientos: movimientos.map((ahorro) => ({
      ...ahorro,
      moneda: ahorro.moneda.trim(),
      monto: Number(ahorro.monto),
      monto_pesos:
        ahorro.monto_pesos === null
          ? null
          : Number(ahorro.monto_pesos),
    })),

    // Acumulado antes de este mes: la pantalla le suma lo del mes
    acumuladoAnterior: totales.anterior,
  };
};

export const guardarCambios = async (
  usuarioId,
  cambios
) => {
  return await guardarCambiosAhorros(
    usuarioId,
    normalizarLote(cambios, normalizarAhorro)
  );
};
