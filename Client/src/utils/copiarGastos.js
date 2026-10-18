const normalizar = (texto) =>
  String(texto || "")
    .trim()
    .toLowerCase();

// A partir de los gastos de un mes de origen, arma las copias para
// el mes (anio, mes): mismo día del mes (ajustado al largo del mes)
// y cuotas avanzadas según los meses transcurridos. Las cuotas que
// ya terminaron se descartan.
export const generarCopias = ({
  gastosOrigen,
  anio,
  mes,
  anioOrigen,
  mesOrigen,
  idsCategoriasValidas,
}) => {
  const diferenciaMeses =
    anio * 12 +
    mes -
    (Number(anioOrigen) * 12 +
      Number(mesOrigen));

  const diasDelMes = new Date(
    anio,
    mes,
    0
  ).getDate();

  const copias = [];

  let cuotasFinalizadas = 0;

  for (const gasto of gastosOrigen) {
    let cuotaActual =
      gasto.cuota_actual ?? "";

    const cuotasTotales =
      gasto.cuotas_totales ?? "";

    if (
      cuotaActual !== "" &&
      cuotasTotales !== ""
    ) {
      cuotaActual =
        Number(cuotaActual) +
        diferenciaMeses;

      if (
        cuotaActual < 1 ||
        cuotaActual >
          Number(cuotasTotales)
      ) {
        cuotasFinalizadas++;

        continue;
      }
    }

    const diaOrigen = Number(
      String(gasto.fecha).slice(8, 10)
    );

    const dia = Math.min(
      diaOrigen || 1,
      diasDelMes
    );

    copias.push({
      fecha: `${anio}-${String(
        mes
      ).padStart(2, "0")}-${String(
        dia
      ).padStart(2, "0")}`,

      descripcion: gasto.descripcion,

      categoriaId:
        idsCategoriasValidas.has(
          gasto.categoria_id
        )
          ? gasto.categoria_id
          : null,

      cuotaActual,

      cuotasTotales,

      monto: Number(gasto.monto),

      observaciones:
        gasto.observaciones || "",
    });
  }

  return { copias, cuotasFinalizadas };
};

// Empareja cada copia con un gasto ya existente de la misma
// descripción (uno a uno, en orden). Si hay pareja, la copia
// "pisa" al existente; si no, es un gasto nuevo.
export const emparejarPorDescripcion = (
  copias,
  existentes
) => {
  const usados = new Set();

  return copias.map((copia) => {
    const existente = existentes.find(
      (fila) =>
        !usados.has(fila.id) &&
        normalizar(fila.descripcion) ===
          normalizar(copia.descripcion)
    );

    if (existente) {
      usados.add(existente.id);
    }

    return {
      copia,
      existente: existente || null,
    };
  });
};
