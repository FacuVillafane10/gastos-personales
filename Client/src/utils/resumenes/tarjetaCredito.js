// Lector de resúmenes de tarjeta de crédito (Visa y Mastercard de
// bancos argentinos). Recibe las líneas que arma extraerTexto.js y
// devuelve los movimientos del resumen con fecha, importe y cuotas.

const MESES = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  set: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

const numeroDeMes = (texto) =>
  MESES[
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .slice(0, 3)
      .toLowerCase()
  ] || null;

const anioCompleto = (anio) => {
  const numero = Number(anio);

  return numero < 100 ? 2000 + numero : numero;
};

// Importes con formato argentino: 1.234,56 / -1.234,56 / 1.234,56-
// (algunos resúmenes no usan separador de miles: 540773,86)
const RE_IMPORTE = /^-?\$?\s?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}-?$/;

export const parsearImporte = (texto) => {
  const limpio = texto.replace(/[$\s]/g, "");

  const negativo =
    limpio.startsWith("-") || limpio.endsWith("-");

  const numero = Number(
    limpio
      .replace(/-/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return negativo ? -numero : numero;
};

// ============================
// FECHAS
// ============================

// dd/mm/aa, dd-mm-aaaa, dd.mm.aa
const RE_FECHA_NUMERICA =
  /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/;

// dd-Oct-26 (Mastercard)
const RE_FECHA_GUIONES =
  /^(\d{1,2})-([A-Za-zÁÉÍÓÚáéíóú]{3,10})\.?-(\d{2}|\d{4})\b/;

// 26 Octubre 15 (Visa: año, mes y día) o 15 Oct 26 (día, mes y año)
const RE_FECHA_ESPACIOS =
  /^(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]{3,10})\.?\s+(\d{1,2}|\d{4})\b/;

// En Visa, si el mes no cambia, la línea empieza solo con el día y el
// número de comprobante.
const RE_SOLO_DIA = /^(\d{1,2})\s+(?=\d{4,}\b)/;

const fechaValida = ({ anio, mes, dia }) =>
  mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31 && anio >= 2000;

const comoNumero = ({ anio, mes, dia }) =>
  anio * 10000 + mes * 100 + dia;

// "26 Octubre 15" puede ser día-mes-año o año-mes-día (Visa). Con la
// fecha de cierre se elige la que cae antes del cierre y más cerca;
// sin cierre, en Visa se asume año-mes-día.
const elegirFecha = (diaPrimero, anioPrimero, contexto, esVisa) => {
  const candidatas = [diaPrimero, anioPrimero].filter(fechaValida);

  if (candidatas.length === 1) return candidatas[0];

  if (contexto.cierre) {
    const tope = comoNumero(contexto.cierre) + 100;

    const previas = candidatas
      .filter((fecha) => comoNumero(fecha) <= tope)
      .sort((a, b) => comoNumero(b) - comoNumero(a));

    if (previas.length > 0) return previas[0];
  }

  return esVisa ? anioPrimero : diaPrimero;
};

// Lee la fecha al principio de la línea. `contexto` guarda el último
// año y mes vistos (para las líneas de Visa que solo traen el día).
const leerFecha = (texto, contexto, esVisa) => {
  let coincidencia = texto.match(RE_FECHA_NUMERICA);

  if (coincidencia) {
    const fecha = {
      dia: Number(coincidencia[1]),
      mes: Number(coincidencia[2]),
      anio: anioCompleto(coincidencia[3]),
    };

    return fechaValida(fecha)
      ? { fecha, largo: coincidencia[0].length }
      : null;
  }

  coincidencia =
    texto.match(RE_FECHA_GUIONES) ||
    texto.match(RE_FECHA_ESPACIOS);

  if (coincidencia) {
    const mes = numeroDeMes(coincidencia[2]);

    if (!mes) return null;

    const primero = Number(coincidencia[1]);

    const ultimo = Number(coincidencia[3]);

    const diaPrimero = {
      anio: anioCompleto(ultimo),
      mes,
      dia: primero,
    };

    const anioPrimero = {
      anio: anioCompleto(primero),
      mes,
      dia: ultimo,
    };

    const fecha = coincidencia[0].includes("-")
      ? diaPrimero
      : elegirFecha(diaPrimero, anioPrimero, contexto, esVisa);

    if (!fechaValida(fecha)) return null;

    contexto.anio = fecha.anio;
    contexto.mes = fecha.mes;

    return { fecha, largo: coincidencia[0].length };
  }

  coincidencia = texto.match(RE_SOLO_DIA);

  if (coincidencia && esVisa && contexto.mes) {
    const fecha = {
      anio: contexto.anio,
      mes: contexto.mes,
      dia: Number(coincidencia[1]),
    };

    return fechaValida(fecha)
      ? { fecha, largo: coincidencia[0].length }
      : null;
  }

  return null;
};

// ============================
// CLASIFICACIÓN
// ============================

const RE_IGNORAR =
  /SALDO ANTERIOR|SALDO ACTUAL|PAGO M[IÍ]NIMO|^TOTAL\b|^L[IÍ]MITE|^VENCIMIENTO|^CIERRE|^PR[OÓ]XIMO/i;

// Pagos del resumen anterior. "TRANSFERENCIA DEUDA" pasa a pesos la
// deuda en dólares (no es un consumo nuevo).
// En Naranja X, "Pago del resumen anterior" trae el pago, el pago en
// dólares y las notas de crédito del período anterior.
const RE_PAGO =
  /SU PAGO|PAGO EN (PESOS|D[OÓ]LARES)|PAGO VENCIMIENTO|NOTA CREDITO PESOS|TRANSFERENCIA DEUDA/i;

const RE_IMPUESTO =
  /^(IVA|IMP\b|IMP\.|IMPUESTO|IMPTO|PERC|DB\b|DB\.?\s?RG|RG\s?\d|IIBB|ING\.? ?BRUTOS|INTERES|COMISI[OÓ]N|COM\.|CARGO|SEGURO|SELLOS|DERECHO|MANTENIMIENTO|SERVICIO DE|RENOVACI[OÓ]N)/i;

// Tasas y textos legales que también traen números.
const RE_LEGALES = /\b(TNA|TEA|CFT|CFTEA|TASA)\b/i;

// C.03/06, CUOTA 03/06, Cuota 3/6
const RE_CUOTA =
  /\bC(?:UOTAS?)?\.?\s*(\d{1,2})\s*\/\s*(\d{1,2})\b/i;

// 03/06 suelto (Mastercard)
const RE_CUOTA_SUELTA = /(?:^|\s)(\d{2})\/(\d{2})(?=\s|$)/;

const leerCuota = (descripcion) => {
  const coincidencia =
    descripcion.match(RE_CUOTA) ||
    descripcion.match(RE_CUOTA_SUELTA);

  if (!coincidencia) return null;

  const actual = Number(coincidencia[1]);

  const total = Number(coincidencia[2]);

  if (actual < 1 || total < 2 || actual > total) {
    return null;
  }

  return {
    actual,
    total,
    texto: coincidencia[0],
  };
};

// Columna "cuota/plan" de Naranja X que no es una cuota: Zeta (plan Z),
// 01 (un pago) y Deb.Aut. (débito automático).
const RE_PLAN_NARANJA = /\s+(Zeta|Deb\.\s?Aut\.?|01)$/i;

const limpiarDescripcion = (texto) => {
  let limpio = texto
    .replace(/\s+/g, " ")
    .trim()
    // tarjeta y cupón de Naranja X ("Naranja X 8796", "NX Visa 618720")
    .replace(/^(Naranja X|NX Visa|NX Master\w*)\s+\d+\s+/i, "")
    // número de comprobante, a veces con la marca pegada (000836*)
    .replace(/^\d{4,}[*K]?\s+/, "")
    // marcas de Visa (*, K) antes del comercio
    .replace(/^[*K]\s+/, "")
    // cargos marcados con * en Naranja X ("*COMISION POR ...")
    .replace(/^\*+/, "")
    // rótulos del margen de Naranja X ("Otros cargos:")
    .replace(/^(Otros|cargos:)(\s+|$)/i, "")
    .replace(/^(Otros|cargos:)(\s+|$)/i, "");

  while (RE_PLAN_NARANJA.test(limpio)) {
    limpio = limpio.replace(RE_PLAN_NARANJA, "");
  }

  return limpio.trim();
};

// ============================
// COLUMNAS PESOS / DÓLARES
// ============================

// Los importes van alineados a la derecha de su columna.
const bordeDerecho = (celda) => celda.x + celda.ancho;

// Encabezado de la tabla de movimientos: "PESOS" y "DÓLARES" en
// mayúsculas, como palabras sueltas. No sirve un "$ ... U$S" suelto
// (aparece en "LA SUMA DE $ ... + U$S ..." con otras posiciones).
const buscarColumnas = (lineas) => {
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    const pesos = linea.celdas.find(
      (celda) => celda.texto.trim() === "PESOS"
    );

    const dolares = linea.celdas.find((celda) =>
      /^(DOLARES|DÓLARES|U\$S)$/.test(celda.texto.trim())
    );

    if (pesos && dolares && dolares.x > pesos.x) {
      return (
        calibrarConSaldoAnterior(lineas.slice(i + 1, i + 6)) || {
          pesos: bordeDerecho(pesos),
          dolares: bordeDerecho(dolares),
        }
      );
    }
  }

  return null;
};

// En algunos resúmenes (la Cordobesa) el encabezado no está alineado
// con los importes. La línea "SALDO ANTERIOR" del detalle trae los dos
// importes (pesos y dólares) en su posición real.
const calibrarConSaldoAnterior = (lineas) => {
  const linea = lineas.find((l) => /SALDO\s+ANTERIOR/i.test(l.texto));

  if (!linea) return null;

  const importes = linea.celdas.filter((celda) =>
    RE_IMPORTE.test(celda.texto.trim())
  );

  if (importes.length < 2) return null;

  return {
    pesos: bordeDerecho(importes[importes.length - 2]),
    dolares: bordeDerecho(importes[importes.length - 1]),
  };
};

// Separa los importes del final de la línea y decide si son pesos o
// dólares. Con encabezado, cada importe tiene que estar alineado a una
// de las dos columnas: los que quedan en el medio (base de un impuesto,
// importe original en otra moneda) vuelven a la descripción. Sin
// encabezado, el primero es pesos y el segundo dólares.
const separarImportes = (linea, columnas) => {
  const tokens = linea.texto.trim().split(/\s+/);

  // subrayados que el PDF dibuja con "_" al final de algunas líneas
  while (tokens.length > 0 && /^_+$/.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const importes = [];

  while (
    tokens.length > 0 &&
    importes.length < 3 &&
    RE_IMPORTE.test(tokens[tokens.length - 1])
  ) {
    importes.unshift(tokens.pop());
  }

  // "$ 1.234,56" o "U$S 10,00" al final: el símbolo queda suelto
  const quitarSimbolos = () => {
    while (
      tokens.length > 0 &&
      /^(\$|U\$S|USD)$/i.test(tokens[tokens.length - 1])
    ) {
      tokens.pop();
    }
  };

  let pesos = null;

  let dolares = null;

  const celdas = columnas
    ? buscarCeldasDeImportes(linea.celdas, importes)
    : null;

  if (celdas) {
    const tolerancia = (columnas.dolares - columnas.pesos) / 2;

    const sueltos = [];

    importes.forEach((importe, indice) => {
      const borde = bordeDerecho(celdas[indice]);

      if (Math.abs(borde - columnas.pesos) <= tolerancia) {
        pesos = parsearImporte(importe);
      } else if (Math.abs(borde - columnas.dolares) <= tolerancia) {
        dolares = parsearImporte(importe);
      } else {
        sueltos.push(importe);
      }
    });

    quitarSimbolos();

    tokens.push(...sueltos);

    quitarSimbolos();
  } else {
    quitarSimbolos();

    if (importes.length >= 2) {
      pesos = parsearImporte(importes[importes.length - 2]);
      dolares = parsearImporte(importes[importes.length - 1]);
    } else if (importes.length === 1) {
      const valor = parsearImporte(importes[0]);

      if (/U\$S|USD/i.test(linea.texto)) dolares = valor;
      else pesos = valor;
    }
  }

  return {
    resto: tokens.join(" "),
    pesos,
    dolares,
  };
};

// Busca, de derecha a izquierda, la celda de cada importe (una distinta
// para cada uno). Si alguno no aparece, devuelve null.
const buscarCeldasDeImportes = (celdas, importes) => {
  const resultado = [];

  let hasta = celdas.length - 1;

  for (let i = importes.length - 1; i >= 0; i--) {
    while (
      hasta >= 0 &&
      !celdas[hasta].texto.trim().endsWith(importes[i])
    ) {
      hasta--;
    }

    if (hasta < 0) return null;

    resultado[i] = celdas[hasta];

    hasta--;
  }

  return resultado;
};

// ============================
// DATOS GENERALES DEL RESUMEN
// ============================

const primerImporte = (texto) => {
  const token = texto
    .split(/\s+/)
    .find((t) => RE_IMPORTE.test(t));

  return token ? parsearImporte(token) : null;
};

// Busca la fecha de cierre después de "CIERRE ACTUAL" (o "CIERRE",
// salvo "CIERRE ANTERIOR"), en esa línea o la siguiente. En el
// encabezado siempre es día, mes y año.
const buscarCierre = (lineas) => {
  for (const etiqueta of [/CIERRE ACTUAL/i, /CIERRE(?! ANTERIOR)/i]) {
    const fecha = buscarFechaTrasEtiqueta(lineas, etiqueta);

    if (fecha) return fecha;
  }

  return null;
};

const buscarFechaTrasEtiqueta = (lineas, etiqueta) => {
  for (let i = 0; i < lineas.length; i++) {
    const texto = lineas[i].texto.replace(/\s+/g, " ");

    const coincidencia = texto.match(etiqueta);

    if (!coincidencia) continue;

    const despues = texto.slice(
      coincidencia.index + coincidencia[0].length
    );

    for (const candidato of [despues, lineas[i + 1]?.texto]) {
      if (!candidato) continue;

      const palabras = candidato.trim().split(/\s+/);

      for (let j = 0; j < palabras.length; j++) {
        const resultado = leerFecha(
          palabras.slice(j).join(" "),
          {},
          false
        );

        if (resultado) return resultado.fecha;
      }
    }
  }

  return null;
};

// ============================
// LECTOR
// ============================

const ultimaFecha = (movimientos) =>
  movimientos
    .map((movimiento) => movimiento.fechaCompra)
    .filter(Boolean)
    .reduce(
      (ultima, fecha) =>
        !ultima || comoNumero(fecha) > comoNumero(ultima)
          ? fecha
          : ultima,
      null
    );

export const leerResumenTarjeta = (lineas) => {
  const textoCompleto = lineas
    .map((linea) => linea.texto)
    .join("\n");

  // Naranja X también menciona "NX Visa" en algunas líneas.
  const esNaranja = /NARANJA/i.test(textoCompleto);

  const esVisa = !esNaranja && /\bVISA\b/i.test(textoCompleto);

  // La Cordobesa (Bancor) dice "Mastercard" solo en el logo; el número
  // de resumen termina en "MC0102".
  const esMaster =
    !esNaranja &&
    !esVisa &&
    /MASTER|\bMC\d{4}\b/i.test(textoCompleto);

  const marca = esNaranja
    ? "Naranja X"
    : esVisa
      ? "Visa"
      : esMaster
        ? "Mastercard"
        : "Tarjeta";

  const columnas = buscarColumnas(lineas);

  const cierreEncabezado = buscarCierre(lineas);

  const cierre = cierreEncabezado;

  const contexto = { cierre };

  const movimientos = [];

  let saldoAnterior = null;

  let saldoActual = null;

  let pagos = 0;

  const lineasPago = [];

  // Naranja X no tiene saldo anterior/actual: se controla contra el
  // total a pagar.
  let totalAPagar = null;

  // Línea sin importe que continúa en la siguiente (Naranja X parte en
  // dos la nota de crédito y el IVA de "Otros cargos").
  let pendiente = null;

  for (const linea of lineas) {
    const texto = linea.texto.replace(/\s+/g, " ").trim();

    const anterior = pendiente;

    pendiente = null;

    const total = texto.match(
      /total a pagar es \$?\s?((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})/i
    );

    if (total && totalAPagar === null) {
      totalAPagar = parsearImporte(total[1]);
    }

    if (/SALDO ANTERIOR/i.test(texto) && saldoAnterior === null) {
      saldoAnterior = primerImporte(texto);
    }

    if (/SALDO ACTUAL/i.test(texto) && saldoActual === null) {
      saldoActual = primerImporte(texto);
    }

    if (RE_LEGALES.test(texto)) continue;

    const fechaPropia = leerFecha(texto, contexto, esVisa);

    const { resto, pesos, dolares } = separarImportes(
      {
        texto: fechaPropia
          ? texto.slice(fechaPropia.largo)
          : texto,
        celdas: linea.celdas,
      },
      columnas
    );

    if (pesos === null && dolares === null) {
      const sinImporte = limpiarDescripcion(resto);

      // Un rótulo suelto del margen ("cargos:") no corta lo pendiente.
      if (!sinImporte && !fechaPropia) {
        pendiente = anterior;

        continue;
      }

      // Puede continuar en la línea siguiente: una fecha sin importe
      // o el título de un impuesto.
      if (
        sinImporte &&
        (fechaPropia || RE_IMPUESTO.test(sinImporte))
      ) {
        pendiente = {
          lectura: fechaPropia,
          descripcion: sinImporte,
        };
      }

      continue;
    }

    const continua = !fechaPropia && anterior;

    const lectura = continua ? anterior.lectura : fechaPropia;

    const descripcion = continua
      ? `${anterior.descripcion} ${limpiarDescripcion(resto)}`.trim()
      : limpiarDescripcion(resto);

    if (!descripcion) continue;

    if (RE_PAGO.test(descripcion)) {
      if (lectura && pesos !== null) {
        pagos += pesos;

        lineasPago.push({ descripcion, monto: pesos });
      }

      continue;
    }

    if (RE_IGNORAR.test(descripcion)) continue;

    const esImpuesto = RE_IMPUESTO.test(descripcion);

    // Sin fecha solo se aceptan impuestos y cargos que aparecen
    // después de los consumos (al pie del detalle).
    if (!lectura && !(esImpuesto && movimientos.length > 0)) {
      continue;
    }

    const cuota = esImpuesto ? null : leerCuota(descripcion);

    const usaDolares = !pesos && dolares;

    const monto = usaDolares ? dolares : pesos;

    let tipo = "consumo";

    if (monto < 0) tipo = "credito";
    else if (usaDolares) tipo = "dolares";
    else if (esImpuesto) tipo = "impuesto";
    else if (cuota) tipo = "cuota";

    movimientos.push({
      fechaCompra: lectura ? lectura.fecha : null,
      descripcion: cuota
        ? descripcion.replace(cuota.texto, " ").replace(/\s+/g, " ").trim()
        : descripcion,
      cuotaActual: cuota ? cuota.actual : null,
      cuotasTotales: cuota ? cuota.total : null,
      monto,
      moneda: usaDolares ? "USD" : "ARS",
      tipo,
    });
  }

  // Control: lo detectado en pesos debería explicar la diferencia
  // entre el saldo anterior (menos los pagos) y el saldo actual. En
  // Naranja X, tiene que dar el total a pagar.
  let control = null;

  const detectado = movimientos
    .filter((movimiento) => movimiento.moneda === "ARS")
    .reduce((suma, movimiento) => suma + movimiento.monto, 0);

  const redondear = (valor) => Math.round(valor * 100) / 100;

  if (saldoActual !== null && saldoAnterior !== null) {
    control = {
      esperado: redondear(saldoActual - saldoAnterior - pagos),
      detectado: redondear(detectado),
      saldoAnterior,
      saldoActual,
      lineasPago,
    };
  } else if (totalAPagar !== null) {
    control = {
      esperado: redondear(totalAPagar),
      detectado: redondear(detectado),
      saldoAnterior: 0,
      saldoActual: totalAPagar,
      lineasPago: [],
    };
  }

  return {
    marca,
    // Sin fecha de cierre en el encabezado (Naranja X), se usa la
    // última fecha del detalle.
    cierre: cierre || ultimaFecha(movimientos),
    movimientos,
    control,
  };
};
