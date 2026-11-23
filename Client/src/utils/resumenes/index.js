import { leerResumenTarjeta } from "./tarjetaCredito";

export { extraerLineas, ErrorClave } from "./extraerTexto";

const nombresMesesCortos = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

// Decide qué tipo de resumen es y lo lee. Por ahora solo tarjetas de
// crédito; el resumen de la cuenta bancaria se rechaza con un aviso.
export const leerResumen = (lineas) => {
  const texto = lineas
    .map((linea) => linea.texto)
    .join("\n")
    .replace(/\s+/g, " ")
    .toUpperCase();

  if (
    /ESTADO DE CUENTAS? UNIFICADO|CAJA DE AHORRO|CUENTA SUELDO/.test(texto) &&
    !/PAGO M[IÍ]NIMO/.test(texto)
  ) {
    throw new Error(
      "Este PDF es el resumen de la cuenta bancaria. Por ahora solo se pueden importar resúmenes de tarjeta de crédito."
    );
  }

  const esTarjeta =
    /VISA|MASTER|\bMC\d{4}\b|AMERICAN EXPRESS|CABAL|NARANJA/.test(
      texto
    ) && /PAGO M[IÍ]NIMO|SALDO ACTUAL|CIERRE|TOTAL A PAGAR/.test(texto);

  if (!esTarjeta) {
    throw new Error(
      "No se reconoció el PDF como un resumen de tarjeta de crédito."
    );
  }

  const resumen = leerResumenTarjeta(lineas);

  if (resumen.movimientos.length === 0) {
    throw new Error(
      "No se encontraron consumos en el resumen."
    );
  }

  return resumen;
};

const normalizar = (texto) =>
  String(texto || "")
    .trim()
    .toLowerCase();

const numeroCuota = (valor) => Number(valor) || 0;

// Empareja los movimientos del resumen con los gastos que ya estaban
// cargados en el mes: mismo importe y misma cuota (aunque la
// descripción sea distinta, ej. "Saymood" y "DLO*SAYMOOD"). Cada gasto
// se usa una sola vez y se prefiere el que además tiene la misma
// descripción. El movimiento que coincide lo reemplaza, pero conserva
// su nombre, categoría y si estaba pagado.
export const emparejarConExistentes = (movimientos, existentes) => {
  const usados = new Set();

  const coincide = (movimiento, gasto) =>
    !usados.has(gasto.id) &&
    Math.abs(Number(gasto.monto) - Math.abs(movimiento.monto)) < 0.005 &&
    numeroCuota(gasto.cuotaActual) ===
      numeroCuota(movimiento.cuotaActual) &&
    numeroCuota(gasto.cuotasTotales) ===
      numeroCuota(movimiento.cuotasTotales);

  return movimientos.map((movimiento) => {
    if (movimiento.moneda !== "ARS" || movimiento.monto <= 0) {
      return movimiento;
    }

    const candidatos = existentes.filter((gasto) =>
      coincide(movimiento, gasto)
    );

    const existente =
      candidatos.find(
        (gasto) =>
          normalizar(gasto.descripcion) ===
          normalizar(movimiento.descripcion)
      ) || candidatos[0];

    if (!existente) return movimiento;

    usados.add(existente.id);

    return {
      ...movimiento,
      reemplaza: {
        id: existente.id,
        descripcion: existente.descripcion?.trim() || "",
        categoriaId: existente.categoriaId || null,
        pagado: existente.pagado === true,
      },
    };
  });
};

const dosDigitos = (numero) =>
  String(numero).padStart(2, "0");

const formatearFecha = ({ anio, mes, dia }) =>
  `${dosDigitos(dia)}/${dosDigitos(mes)}/${String(anio).slice(-2)}`;

// Pasa los movimientos elegidos a filas de gasto del mes que se está
// viendo: mismo día de la compra (ajustado al largo del mes) y la
// fecha original en observaciones.
export const armarGastos = ({
  movimientos,
  marca,
  cierre,
  anio,
  mes,
}) => {
  const diasDelMes = new Date(anio, mes, 0).getDate();

  const resumen = cierre
    ? ` (resumen ${marca} ${nombresMesesCortos[cierre.mes - 1]}/${String(
        cierre.anio
      ).slice(-2)})`
    : ` (resumen ${marca})`;

  return movimientos.map((movimiento) => {
    const diaOrigen =
      movimiento.fechaCompra?.dia ?? cierre?.dia ?? 1;

    const dia = Math.min(diaOrigen, diasDelMes);

    const compra = movimiento.fechaCompra
      ? `Compra ${formatearFecha(movimiento.fechaCompra)}`
      : "Importado";

    // Si reemplaza a un gasto cargado a mano, queda con ese nombre y
    // el del resumen pasa a las observaciones.
    const nombrePropio = movimiento.reemplaza?.descripcion;

    const otroNombre =
      nombrePropio &&
      normalizar(nombrePropio) !== normalizar(movimiento.descripcion)
        ? ` · ${movimiento.descripcion}`
        : "";

    return {
      fecha: `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`,
      descripcion: (nombrePropio || movimiento.descripcion).slice(
        0,
        255
      ),
      pagado: movimiento.reemplaza?.pagado === true,
      categoriaId: movimiento.categoriaId || null,
      cuotaActual: movimiento.cuotaActual ?? "",
      cuotasTotales: movimiento.cuotasTotales ?? "",
      // En la vista previa se puede corregir el importe (por ejemplo
      // pasar a pesos un consumo en dólares).
      monto: Math.abs(movimiento.montoCarga ?? movimiento.monto),
      observaciones:
        compra +
        resumen +
        otroNombre +
        (movimiento.moneda === "USD"
          ? ` · consumo de US$ ${movimiento.monto}`
          : ""),
    };
  });
};
