// Validaciones compartidas por los servicios de ingresos y ahorros.

export const MAX_CAMBIOS = 500;

export const validarPeriodo = (anio, mes) => {
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

export const fechaValida = (texto) => {
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

// Valida el lote { crear, actualizar, eliminar } y normaliza cada
// elemento con la función recibida.
export const normalizarLote = (
  cambios,
  normalizar
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

  return {
    crear: crear.map((item) =>
      normalizar(item)
    ),

    actualizar: actualizar.map((item) =>
      normalizar(item, true)
    ),

    eliminar: eliminar.map((itemId) => {
      const numero = Number(itemId);

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
  };
};
