// Fecha sugerida para un registro nuevo (gasto o ingreso): siempre dentro
// del mes que se está viendo. Usa el día de hoy según el dispositivo (no
// UTC); si el mes visto tiene menos días, se ajusta al último día.
// Días desde hoy (según el dispositivo) hasta una fecha "AAAA-MM-DD":
// 0 es hoy, negativo si ya pasó.
export const diasHasta = (fecha) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);

  const hoy = new Date();

  const inicioHoy = Date.UTC(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  );

  return Math.round(
    (Date.UTC(anio, mes - 1, dia) - inicioHoy) / 86400000
  );
};

// "Vence hoy", "Vence en 3 días", "Venció hace 2 días"...
export const textoVencimiento = (fecha) => {
  const dias = diasHasta(fecha);

  const [, mes, dia] = fecha.split("-");

  const corta = `${dia}/${mes}`;

  if (dias === 0) return `Vence hoy (${corta})`;

  if (dias === 1) return `Vence mañana (${corta})`;

  if (dias > 1) return `Vence el ${corta} · en ${dias} días`;

  if (dias === -1) return `Venció ayer (${corta})`;

  return `Venció el ${corta} · hace ${-dias} días`;
};

// Vencido o a 3 días o menos.
export const vencimientoUrgente = (fecha) =>
  diasHasta(fecha) <= 3;

export const obtenerFechaSugerida = (anio, mes) => {
  const diasDelMes = new Date(anio, mes, 0).getDate();

  const dia = Math.min(
    new Date().getDate(),
    diasDelMes
  );

  return [
    anio,
    String(mes).padStart(2, "0"),
    String(dia).padStart(2, "0"),
  ].join("-");
};
