import { obtenerResumenMensual } from "../repositories/resumen.repository.js";

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

  const origenes = await obtenerResumenMensual(
    usuarioId,
    anioNumero,
    mesNumero
  );

  const origenesFormateados = origenes.map(
    (origen) => ({
      ...origen,
      total: Number(origen.total),
    })
  );

  const totalGeneral = origenesFormateados.reduce(
    (acumulador, origen) =>
      acumulador + origen.total,
    0
  );

  return {
    periodo: {
      anio: anioNumero,
      mes: mesNumero,
    },
    totalGeneral,
    origenes: origenesFormateados,
  };
};