// Fecha sugerida para un registro nuevo (gasto o ingreso): siempre dentro
// del mes que se está viendo. Usa el día de hoy según el dispositivo (no
// UTC); si el mes visto tiene menos días, se ajusta al último día.
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
