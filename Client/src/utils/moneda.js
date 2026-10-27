// Formatea un importe en pesos (sin decimales) o dólares (hasta 2).
export const formatearMonto = (valor, moneda = "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: moneda === "USD" ? 2 : 0,
  }).format(valor);
