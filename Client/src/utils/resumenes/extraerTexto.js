// Lectura de PDFs de resúmenes en el navegador con pdf.js. El archivo
// y la clave nunca salen del equipo.

// Dos fragmentos están en la misma línea si su altura difiere menos
// que esto (en puntos del PDF).
const TOLERANCIA_Y = 2.5;

// Agrupa los fragmentos de texto de una página en líneas, de arriba
// hacia abajo. Cada línea guarda sus celdas con la posición X para
// poder distinguir columnas (por ejemplo pesos y dólares).
export const agruparEnLineas = (items) => {
  const fragmentos = items
    .filter((item) => item.str && item.str.trim())
    .map((item) => ({
      x: item.transform[4],
      y: item.transform[5],
      ancho: item.width || 0,
      texto: item.str,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lineas = [];

  for (const fragmento of fragmentos) {
    const linea = lineas.find(
      (l) => Math.abs(l.y - fragmento.y) < TOLERANCIA_Y
    );

    if (linea) {
      linea.celdas.push(fragmento);
    } else {
      lineas.push({ y: fragmento.y, celdas: [fragmento] });
    }
  }

  return lineas.map((linea) => {
    const celdas = unirCeldasPegadas(
      linea.celdas.sort((a, b) => a.x - b.x)
    );

    return {
      celdas,
      texto: celdas
        .map((celda) => celda.texto.trim())
        .join("  "),
    };
  });
};

// pdf.js a veces corta una palabra en varios fragmentos: si dos quedan
// pegados (o separados por un espacio), se unen en una sola celda.
const unirCeldasPegadas = (celdas) => {
  const resultado = [];

  for (const celda of celdas) {
    const anterior = resultado[resultado.length - 1];

    const separacion = anterior
      ? celda.x - (anterior.x + anterior.ancho)
      : Infinity;

    if (anterior && separacion < 4) {
      anterior.texto +=
        (separacion > 1 ? " " : "") + celda.texto;

      anterior.ancho =
        celda.x + celda.ancho - anterior.x;
    } else {
      resultado.push({ ...celda });
    }
  }

  return resultado;
};

let pdfjsCargado = null;

// pdf.js pesa bastante: se carga solo cuando se usa.
const cargarPdfjs = async () => {
  if (!pdfjsCargado) {
    pdfjsCargado = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

      return pdfjs;
    });
  }

  return pdfjsCargado;
};

export class ErrorClave extends Error {
  constructor(incorrecta) {
    super(
      incorrecta
        ? "La clave del PDF es incorrecta."
        : "El PDF tiene clave. Ingresala para abrirlo."
    );

    this.incorrecta = incorrecta;
  }
}

// Devuelve todas las líneas del PDF (todas las páginas seguidas).
export const extraerLineas = async (archivo, clave) => {
  if (archivo.size === 0) {
    throw new Error(
      "El archivo está vacío (0 bytes). Volvé a descargar el resumen del banco."
    );
  }

  const pdfjs = await cargarPdfjs();

  const datos = new Uint8Array(await archivo.arrayBuffer());

  // En pdf.js 6 el documento se libera desde la tarea de carga.
  const tarea = pdfjs.getDocument({
    data: datos,
    password: clave || undefined,
  });

  let documento;

  try {
    documento = await tarea.promise;
  } catch (error) {
    tarea.destroy();

    if (error?.name === "PasswordException") {
      throw new ErrorClave(
        error.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD
      );
    }

    throw new Error(
      "No se pudo leer el PDF. ¿Es el resumen descargado del banco?"
    );
  }

  const lineas = [];

  try {
    for (let numero = 1; numero <= documento.numPages; numero++) {
      const pagina = await documento.getPage(numero);

      const contenido = await pagina.getTextContent();

      lineas.push(...agruparEnLineas(contenido.items));
    }
  } finally {
    tarea.destroy();
  }

  return lineas;
};
