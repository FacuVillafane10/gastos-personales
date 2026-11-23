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
    /VISA|MASTER|AMERICAN EXPRESS|CABAL|NARANJA/.test(texto) &&
    /PAGO M[IÍ]NIMO|SALDO ACTUAL|CIERRE/.test(texto);

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

    return {
      fecha: `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`,
      descripcion: movimiento.descripcion.slice(0, 255),
      categoriaId: movimiento.categoriaId || null,
      cuotaActual: movimiento.cuotaActual ?? "",
      cuotasTotales: movimiento.cuotasTotales ?? "",
      // En la vista previa se puede corregir el importe (por ejemplo
      // pasar a pesos un consumo en dólares).
      monto: Math.abs(movimiento.montoCarga ?? movimiento.monto),
      observaciones:
        compra +
        resumen +
        (movimiento.moneda === "USD"
          ? ` · consumo de US$ ${movimiento.monto}`
          : ""),
    };
  });
};
