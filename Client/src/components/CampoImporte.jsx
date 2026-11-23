import { useState } from "react";

// Campo de importe que se lee fácil: muestra "124.999,92" y formatea
// mientras se escribe. La coma es el decimal; un punto tipeado se toma
// como coma (teclados de celular sin coma) y al pegar se acepta tanto
// "1.234,56" como "1234.56". onChange recibe el valor normalizado
// ("124999.92").

// Texto pegado o cargado: "1.234,56" → "1234.56"; "1234.5" → "1234.5";
// "1.234" → "1234".
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

// Mientras se escribe: los puntos son de miles (se recalculan), la
// primera coma es el decimal (hasta 2 decimales).
const formatearEnVivo = (texto) => {
  const [entero = "", ...resto] = String(texto)
    .replace(/[^\d,]/g, "")
    .split(",");

  const enteroLimpio = entero.replace(/^0+(?=\d)/, "");

  const enteroConPuntos = enteroLimpio.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "."
  );

  const tieneComa = resto.length > 0;

  const decimales = resto.join("").slice(0, 2);

  return {
    texto: tieneComa
      ? `${enteroConPuntos},${decimales}`
      : enteroConPuntos,
    valor: tieneComa
      ? `${enteroLimpio}.${decimales}`
      : enteroLimpio,
  };
};

// Valor guardado ("1234.5" o 1234.5) → texto para editar ("1.234,5")
const aTextoEditable = (valor) =>
  valor === "" || valor === null || valor === undefined
    ? ""
    : formatearEnVivo(String(valor).replace(".", ",")).texto;

// Cantidad de dígitos y comas antes de una posición (sirve para dejar
// el cursor en el mismo lugar después de reformatear).
const significativosAntes = (texto, posicion) =>
  texto.slice(0, posicion).replace(/[^\d,]/g, "").length;

const posicionTras = (texto, cantidad) => {
  if (cantidad === 0) return 0;

  let vistos = 0;

  for (let i = 0; i < texto.length; i++) {
    if (/[\d,]/.test(texto[i])) vistos++;

    if (vistos === cantidad) return i + 1;
  }

  return texto.length;
};

const CampoImporte = ({
  value,
  onChange,
  className = "",
  ...resto
}) => {
  // Texto mientras el campo tiene el foco (null = no se está editando)
  const [editando, setEditando] = useState(null);

  // Si el valor cambió desde afuera mientras se edita (ej. se vació al
  // guardar), se muestra el valor nuevo y no lo que se había escrito.
  const sincronizado =
    editando !== null &&
    normalizarImporte(editando) ===
      normalizarImporte(String(value ?? ""));

  const mostrado =
    editando !== null && sincronizado
      ? editando
      : aTextoEditable(value);

  const cambiar = (event) => {
    const campo = event.target;

    let crudo = campo.value;

    let cursor = campo.selectionStart ?? crudo.length;

    const tipo = event.nativeEvent?.inputType || "";

    let resultado;

    if (tipo.startsWith("insertFromPaste")) {
      // pegado: se interpreta el número completo
      resultado = formatearEnVivo(
        normalizarImporte(crudo).replace(".", ",")
      );

      cursor = resultado.texto.length;
    } else {
      // un punto recién tipeado es la coma decimal
      if (
        event.nativeEvent?.data === "." &&
        crudo[cursor - 1] === "."
      ) {
        crudo =
          crudo.slice(0, cursor - 1) +
          "," +
          crudo.slice(cursor);
      }

      const antes = significativosAntes(crudo, cursor);

      resultado = formatearEnVivo(crudo);

      cursor = posicionTras(resultado.texto, antes);
    }

    setEditando(resultado.texto);

    onChange(resultado.valor);

    // dejar el cursor donde estaba, después de redibujar
    requestAnimationFrame(() => {
      if (document.activeElement === campo) {
        campo.setSelectionRange(cursor, cursor);
      }
    });
  };

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
      onChange={cambiar}
    />
  );
};

export default CampoImporte;
