import { useState } from "react";

// Campo de importe que se lee fácil: muestra "124.999,92" y, al
// editarlo, el número sin puntos de miles ("124999,92"). Acepta coma o
// punto decimal. onChange recibe el valor normalizado ("124999.92").

const formatear = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const aTextoEditable = (valor) =>
  valor === "" || valor === null || valor === undefined
    ? ""
    : String(valor).replace(".", ",");

// "1.234,56" → "1234.56"; "1234.5" → "1234.5"; "1.234" → "1234"
const normalizarImporte = (texto) => {
  const limpio = String(texto).replace(/[^\d.,]/g, "");

  if (limpio.includes(",")) {
    return limpio.replace(/\./g, "").replace(",", ".");
  }

  const partes = limpio.split(".");

  // un solo punto con 1 o 2 decimales: es la coma decimal
  if (partes.length === 2 && partes[1].length <= 2) {
    return limpio;
  }

  return partes.join("");
};

const CampoImporte = ({
  value,
  onChange,
  className = "",
  ...resto
}) => {
  // Mientras se edita, se muestra lo que se escribe tal cual.
  const [editando, setEditando] = useState(null);

  const numero = Number(value);

  const mostrado =
    editando !== null
      ? editando
      : value === "" || !Number.isFinite(numero)
        ? ""
        : formatear.format(numero);

  return (
    <input
      {...resto}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={`campo-importe-tabla ${className}`.trim()}
      value={mostrado}
      onFocus={() => setEditando(aTextoEditable(value))}
      onBlur={() => setEditando(null)}
      onChange={(event) => {
        setEditando(event.target.value);

        onChange(normalizarImporte(event.target.value));
      }}
    />
  );
};

export default CampoImporte;
