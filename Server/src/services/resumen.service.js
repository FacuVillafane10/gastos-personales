import {
  obtenerGastosEnCuotas,
  obtenerGastosPorCategoria,
  obtenerResumenMensual,
  obtenerTotalGastos,
} from "../repositories/resumen.repository.js";
import { obtenerTotalIngresos } from "../repositories/ingreso.repository.js";
import { obtenerTotalesAhorro } from "../repositories/ahorro.repository.js";
import { generarFijos } from "../repositories/gastoFijo.repository.js";

const sumarMeses = (anio, mes, cantidad) => {
  const indice = anio * 12 + (mes - 1) + cantidad;

  return {
    anio: Math.floor(indice / 12),
    mes: (indice % 12) + 1,
  };
};

// Cuánto queda por pagar en cuotas después del mes consultado.
// Cada gasto del mes es una cuota: se asume que las restantes
// tienen el mismo importe.
const calcularCuotasPendientes = (
  filas,
  anio,
  mes
) => {
  const compras = filas
    .map((fila) => ({
      monto: Number(fila.monto),
      restantes:
        Number(fila.cuotas_totales) -
        Number(fila.cuota_actual),
    }))
    .filter(
      (compra) =>
        compra.restantes > 0 && compra.monto > 0
    );

  if (compras.length === 0) {
    return null;
  }

  const maxRestantes = Math.max(
    ...compras.map((compra) => compra.restantes)
  );

  const porMes = [];

  // Se devuelven los próximos 12 meses como máximo
  for (
    let k = 1;
    k <= Math.min(maxRestantes, 12);
    k++
  ) {
    porMes.push({
      ...sumarMeses(anio, mes, k),

      total: compras
        .filter((compra) => compra.restantes >= k)
        .reduce(
          (suma, compra) => suma + compra.monto,
          0
        ),
    });
  }

  return {
    total: compras.reduce(
      (suma, compra) =>
        suma + compra.monto * compra.restantes,
      0
    ),

    cantidadCuotas: compras.reduce(
      (suma, compra) => suma + compra.restantes,
      0
    ),

    cantidadCompras: compras.length,

    ultimoMes: sumarMeses(anio, mes, maxRestantes),

    porMes,
  };
};

export const generarResumenMensual = async (
  usuarioId,
  anio,
  mes
) => {
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

  // Al abrir el mes se cargan los gastos fijos que falten.
  await generarFijos(usuarioId, anioNumero, mesNumero);

  const origenes = await obtenerResumenMensual(
    usuarioId,
    anioNumero,
    mesNumero
  );

  const origenesFormateados = origenes.map(
    (origen) => ({
      ...origen,
      total: Number(origen.total),
      pagado: Number(origen.pagado),
    })
  );

  const totalGeneral = origenesFormateados.reduce(
    (acumulador, origen) =>
      acumulador + origen.total,
    0
  );

  const totalIngresos =
    await obtenerTotalIngresos(
      usuarioId,
      anioNumero,
      mesNumero
    );

  const anterior = sumarMeses(anioNumero, mesNumero, -1);

  const [
    categorias,
    totalAnterior,
    filasCuotas,
    totalesAhorro,
  ] = await Promise.all([
    obtenerGastosPorCategoria(
      usuarioId,
      anioNumero,
      mesNumero
    ),

    obtenerTotalGastos(
      usuarioId,
      anterior.anio,
      anterior.mes
    ),

    obtenerGastosEnCuotas(
      usuarioId,
      anioNumero,
      mesNumero
    ),

    obtenerTotalesAhorro(
      usuarioId,
      anioNumero,
      mesNumero
    ),
  ]);

  return {
    periodo: {
      anio: anioNumero,
      mes: mesNumero,
    },
    totalGeneral,
    totalPagado: origenesFormateados.reduce(
      (acumulador, origen) =>
        acumulador + origen.pagado,
      0
    ),
    totalIngresos,

    // Disponible del mes: lo ahorrado en pesos se aparta del balance
    // (un retiro lo devuelve). Los dólares no se convierten.
    // Las compras de dólares también restan los pesos pagados.
    balance:
      totalIngresos -
      totalGeneral -
      totalesAhorro.mes.ARS -
      totalesAhorro.pesosCompraMes,

    ahorros: {
      mes: totalesAhorro.mes,
      acumulado: totalesAhorro.acumulado,
      pesosCompraMes: totalesAhorro.pesosCompraMes,
    },

    origenes: origenesFormateados,

    categorias: categorias.map((categoria) => ({
      id: categoria.categoria_id,
      nombre: categoria.nombre || "Sin categoría",
      total: Number(categoria.total),
    })),

    mesAnterior: {
      anio: anterior.anio,
      mes: anterior.mes,
      total: totalAnterior,
    },

    cuotasPendientes: calcularCuotasPendientes(
      filasCuotas,
      anioNumero,
      mesNumero
    ),
  };
};