import { useState } from "react";

import CampoPassword from "./CampoPassword";

import {
  armarGastos,
  ErrorClave,
  extraerLineas,
  emparejarConExistentes,
  leerResumen,
} from "../utils/resumenes";

import { formatearMonto } from "../utils/moneda";

const etiquetasTipo = {
  consumo: "Consumo",
  cuota: "Cuota",
  impuesto: "Impuesto / cargo",
  dolares: "En dólares",
  credito: "Crédito",
};

const formatearFecha = (fecha) =>
  fecha
    ? `${String(fecha.dia).padStart(2, "0")}/${String(
        fecha.mes
      ).padStart(2, "0")}/${String(fecha.anio).slice(-2)}`
    : "—";

// Los créditos (devoluciones, bonificaciones) no se pueden cargar como
// gasto; los consumos en dólares quedan sin marcar para revisarlos. Si
// el movimiento reemplaza a un gasto cargado a mano, toma su categoría.
const preparaFilas = (movimientos) =>
  movimientos.map((movimiento, indice) => ({
    ...movimiento,
    clave: movimiento.indice ?? indice,
    seleccionado: ["consumo", "cuota", "impuesto"].includes(
      movimiento.tipo
    ),
    montoCarga: Math.abs(movimiento.monto),
    categoriaId: movimiento.reemplaza?.categoriaId || "",
  }));

// Grupos por titular (tarjetas adicionales). Lo que no es de ningún
// titular (impuestos y cargos de la cuenta) va en "Cargos generales".
const GENERALES = "__generales";

const claveTitular = (movimiento) =>
  movimiento.titular || GENERALES;

const nombreTitular = (clave) =>
  clave === GENERALES ? "Cargos generales" : clave;

// Qué titulares se eligieron la última vez en este origen (se guarda en
// el dispositivo).
const claveGuardada = (origenId) =>
  `importar-titulares-${origenId}`;

const leerElegidos = (origenId) => {
  try {
    return JSON.parse(
      localStorage.getItem(claveGuardada(origenId)) || "null"
    );
  } catch {
    return null;
  }
};

const guardarElegidos = (origenId, elegidos) => {
  try {
    localStorage.setItem(
      claveGuardada(origenId),
      JSON.stringify([...elegidos])
    );
  } catch {
    // sin almacenamiento disponible: no se recuerda
  }
};

const ImportarResumen = ({
  origenId,
  anio,
  mes,
  nombreMes,
  categorias,
  existentes,
  onCerrar,
  onImportar,
}) => {
  const [archivo, setArchivo] = useState(null);

  const [clave, setClave] = useState("");

  const [pideClave, setPideClave] = useState(false);

  const [leyendo, setLeyendo] = useState(false);

  const [error, setError] = useState("");

  const [resumen, setResumen] = useState(null);

  const [filas, setFilas] = useState([]);

  // El PDF reemplaza lo cargado en el mes: se borran los gastos que ya
  // había, salvo los que se marquen para conservar.
  const [conservar, setConservar] = useState(
    () => new Set()
  );

  // Titulares cuyos movimientos se muestran y se pueden cargar.
  const [elegidos, setElegidos] = useState(
    () => new Set()
  );

  // Las filas se arman solo con los titulares elegidos, así el
  // emparejamiento con lo ya cargado no usa movimientos ocultos.
  const armarFilas = (leido, titularesElegidos) =>
    preparaFilas(
      emparejarConExistentes(
        leido.movimientos
          .map((movimiento, indice) => ({
            ...movimiento,
            indice,
          }))
          .filter((movimiento) =>
            titularesElegidos.has(claveTitular(movimiento))
          ),
        existentes
      )
    );

  const leerArchivo = async (event) => {
    event.preventDefault();

    if (!archivo) {
      setError("Elegí el PDF del resumen.");

      return;
    }

    try {
      setLeyendo(true);
      setError("");

      const lineas = await extraerLineas(archivo, clave);

      const leido = leerResumen(lineas);

      setResumen(leido);

      const disponibles = new Set(
        leido.movimientos.map(claveTitular)
      );

      const anteriores = (leerElegidos(origenId) || []).filter(
        (clave) => disponibles.has(clave)
      );

      const iniciales =
        anteriores.length > 0
          ? new Set(anteriores)
          : disponibles;

      setElegidos(iniciales);

      setFilas(armarFilas(leido, iniciales));

      setConservar(new Set());
    } catch (error) {
      if (error instanceof ErrorClave) {
        setPideClave(true);
      }

      setError(error.message);
    } finally {
      setLeyendo(false);
    }
  };

  const cambiarFila = (clave, cambios) => {
    setFilas((actuales) =>
      actuales.map((fila) =>
        fila.clave === clave ? { ...fila, ...cambios } : fila
      )
    );
  };

  const titulares = resumen
    ? [...new Set(resumen.movimientos.map(claveTitular))].map(
        (clave) => ({
          clave,
          cantidad: resumen.movimientos.filter(
            (movimiento) => claveTitular(movimiento) === clave
          ).length,
        })
      )
    : [];

  const cambiarTitular = (clave) => {
    const nuevos = new Set(elegidos);

    if (nuevos.has(clave)) nuevos.delete(clave);
    else nuevos.add(clave);

    setElegidos(nuevos);

    setFilas(armarFilas(resumen, nuevos));
  };

  const seleccionadas = filas.filter(
    (fila) => fila.seleccionado
  );

  const totalSeleccionado = seleccionadas.reduce(
    (suma, fila) => suma + (Number(fila.montoCarga) || 0),
    0
  );

  const reemplazadoPor = new Map(
    filas
      .filter((fila) => fila.reemplaza)
      .map((fila) => [fila.reemplaza.id, fila])
  );

  const idsABorrar = existentes
    .filter((gasto) => !conservar.has(gasto.id))
    .map((gasto) => gasto.id);

  const cambiarConservar = (id, valor) => {
    setConservar((actual) => {
      const nuevo = new Set(actual);

      if (valor) nuevo.add(id);
      else nuevo.delete(id);

      return nuevo;
    });
  };

  const diferenciaControl = resumen?.control
    ? Math.round(
        (resumen.control.esperado - resumen.control.detectado) * 100
      ) / 100
    : null;

  const importar = () => {
    const invalida = seleccionadas.find(
      (fila) => !(Number(fila.montoCarga) > 0)
    );

    if (invalida) {
      setError(
        `Revisá el importe de "${invalida.descripcion}".`
      );

      return;
    }

    if (titulares.length > 1) {
      guardarElegidos(origenId, elegidos);
    }

    onImportar(
      armarGastos({
        movimientos: seleccionadas.map((fila) => ({
          ...fila,
          montoCarga: Number(fila.montoCarga),
          categoriaId: Number(fila.categoriaId) || null,
        })),
        marca: resumen.marca,
        cierre: resumen.cierre,
        anio,
        mes,
      }),
      idsABorrar,
      resumen.vencimiento
    );
  };

  return (
    <div className="modal-overlay">

      <div
        className={
          resumen ? "modal modal-importar" : "modal"
        }
      >

        <div className="modal-header">

          <div>

            <span className="modal-label">
              IMPORTAR RESUMEN
            </span>

            <h2>
              {resumen
                ? `Resumen ${resumen.marca}${
                    resumen.cierre
                      ? ` · cierre ${formatearFecha(resumen.cierre)}`
                      : ""
                  }${
                    resumen.vencimiento
                      ? ` · vence ${formatearFecha(resumen.vencimiento)}`
                      : ""
                  }`
                : "Resumen de tarjeta (PDF)"}
            </h2>

          </div>

          <button
            type="button"
            className="modal-cerrar"
            onClick={onCerrar}
            disabled={leyendo}
          >
            ×
          </button>

        </div>


        {!resumen ? (

          <form onSubmit={leerArchivo}>

            <p className="modal-ayuda">
              Elegí el PDF del resumen de la tarjeta de crédito.
              Se lee en tu dispositivo (no se sube a ningún lado)
              y los gastos se agregan a {nombreMes} {anio} para
              que los revises antes de guardar.
            </p>

            <label
              htmlFor="archivoResumen"
              className="campo-label"
            >
              Archivo PDF
            </label>

            <input
              id="archivoResumen"
              type="file"
              accept="application/pdf,.pdf"
              className="campo-input"
              onChange={(event) => {
                setArchivo(event.target.files?.[0] || null);
                setError("");
                setPideClave(false);
                setClave("");
              }}
            />

            {pideClave && (

              <div className="importar-clave">

                <label
                  htmlFor="claveResumen"
                  className="campo-label"
                >
                  Clave del PDF
                </label>

                <CampoPassword
                  id="claveResumen"
                  value={clave}
                  onChange={(event) =>
                    setClave(event.target.value)
                  }
                  autoComplete="off"
                  autoFocus
                />

              </div>

            )}

            {error && (
              <p className="modal-error">
                {error}
              </p>
            )}

            <div className="modal-acciones">

              <button
                type="button"
                className="boton-cancelar"
                onClick={onCerrar}
                disabled={leyendo}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="boton-guardar"
                disabled={leyendo || !archivo}
              >
                {leyendo ? "Leyendo..." : "Leer resumen"}
              </button>

            </div>

          </form>

        ) : (

          <>

            <p className="modal-ayuda">
              Marcá los movimientos que querés cargar. El
              resumen reemplaza lo cargado este mes: si un gasto
              tuyo coincide (mismo importe y cuota), se mantiene
              su nombre y categoría. Los consumos en dólares
              quedan sin marcar: si los cargás, poné el importe
              en pesos.
            </p>

            {diferenciaControl !== null && (
              <div
                className={
                  Math.abs(diferenciaControl) < 1
                    ? "importar-control ok"
                    : "importar-control"
                }
              >
                {Math.abs(diferenciaControl) < 1
                  ? "Lo detectado coincide con el saldo del resumen."
                  : `Lo detectado difiere del saldo del resumen en ${formatearMonto(
                      diferenciaControl
                    )}. Revisá si falta algún movimiento.`}

                {Math.abs(diferenciaControl) >= 1 && (
                  <details className="importar-calculo">
                    <summary>Ver cálculo</summary>

                    <span>
                      Saldo actual:{" "}
                      {formatearMonto(resumen.control.saldoActual)}
                    </span>

                    <span>
                      Saldo anterior:{" "}
                      {formatearMonto(resumen.control.saldoAnterior)}
                    </span>

                    {resumen.control.lineasPago.map((pago, indice) => (
                      <span key={indice}>
                        {pago.descripcion}:{" "}
                        {formatearMonto(pago.monto)}
                      </span>
                    ))}

                    <span>
                      Esperado (consumos):{" "}
                      {formatearMonto(resumen.control.esperado)}
                    </span>

                    <span>
                      Detectado:{" "}
                      {formatearMonto(resumen.control.detectado)}
                    </span>
                  </details>
                )}
              </div>
            )}

            {titulares.length > 1 && (

              <div className="importar-titulares">

                <span>Titulares:</span>

                {titulares.map(({ clave, cantidad }) => (
                  <button
                    key={clave}
                    type="button"
                    className="chip-titular"
                    aria-pressed={elegidos.has(clave)}
                    onClick={() => cambiarTitular(clave)}
                  >
                    {elegidos.has(clave) ? "✓ " : ""}
                    {nombreTitular(clave)} ({cantidad})
                  </button>
                ))}

              </div>

            )}

            <div className="importar-tabla-wrapper">

              <table className="tabla-importar">

                <thead>
                  <tr>
                    <th />
                    <th>Fecha compra</th>
                    <th>Descripción</th>
                    <th>Cuota</th>
                    <th>Importe</th>
                    <th>Categoría</th>
                  </tr>
                </thead>

                <tbody>

                  {filas.map((fila) => (

                    <tr
                      key={fila.clave}
                      className={
                        fila.seleccionado ? "" : "fila-apagada"
                      }
                    >

                      <td className="importar-check">
                        <input
                          type="checkbox"
                          aria-label={`Cargar ${fila.descripcion}`}
                          checked={fila.seleccionado}
                          disabled={fila.tipo === "credito"}
                          onChange={(event) =>
                            cambiarFila(fila.clave, {
                              seleccionado: event.target.checked,
                            })
                          }
                        />
                      </td>

                      <td className="importar-fecha">
                        {formatearFecha(fila.fechaCompra)}
                      </td>

                      <td className="importar-celda-descripcion">
                        <span className="importar-descripcion">
                          {fila.descripcion}
                        </span>

                        {fila.reemplaza && (
                          <span className="importar-tipo tipo-cargado">
                            Reemplaza a: {fila.reemplaza.descripcion}
                          </span>
                        )}

                        {fila.tipo !== "consumo" &&
                          fila.tipo !== "cuota" && (
                            <span
                              className={`importar-tipo tipo-${fila.tipo}`}
                            >
                              {etiquetasTipo[fila.tipo]}
                              {fila.moneda === "USD" &&
                                ` US$ ${fila.monto}`}
                            </span>
                          )}
                      </td>

                      <td className="importar-cuota">
                        {fila.cuotaActual
                          ? `${fila.cuotaActual}/${fila.cuotasTotales}`
                          : "—"}
                      </td>

                      <td className="importar-monto">
                        {fila.tipo === "credito" ? (
                          <span className="importar-credito">
                            {formatearMonto(fila.monto)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            aria-label={`Importe de ${fila.descripcion}`}
                            value={fila.montoCarga}
                            onChange={(event) =>
                              cambiarFila(fila.clave, {
                                montoCarga: event.target.value,
                              })
                            }
                          />
                        )}
                      </td>

                      <td className="importar-categoria">
                        <select
                          aria-label={`Categoría de ${fila.descripcion}`}
                          value={fila.categoriaId}
                          disabled={fila.tipo === "credito"}
                          onChange={(event) =>
                            cambiarFila(fila.clave, {
                              categoriaId: event.target.value,
                            })
                          }
                        >
                          <option value="">
                            Sin categoría
                          </option>

                          {categorias.map((categoria) => (
                            <option
                              key={categoria.id}
                              value={categoria.id}
                            >
                              {categoria.nombre}
                            </option>
                          ))}
                        </select>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            {existentes.length > 0 && (

              <details className="importar-borrar">

                <summary>
                  Se borran {idsABorrar.length} de los{" "}
                  {existentes.length} gastos cargados en{" "}
                  {nombreMes} (tocá para elegir cuáles conservar)
                </summary>

                <ul>
                  {existentes.map((gasto) => {
                    const fila = reemplazadoPor.get(gasto.id);

                    return (
                      <li key={gasto.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={conservar.has(gasto.id)}
                            onChange={(event) =>
                              cambiarConservar(
                                gasto.id,
                                event.target.checked
                              )
                            }
                          />

                          <span>
                            Conservar{" "}
                            <b>
                              {gasto.descripcion ||
                                "(sin descripción)"}
                            </b>{" "}
                            {formatearMonto(
                              Number(gasto.monto) || 0
                            )}
                          </span>
                        </label>

                        {fila && fila.seleccionado && (
                          <small>
                            Lo reemplaza {fila.descripcion}
                          </small>
                        )}
                      </li>
                    );
                  })}
                </ul>

              </details>

            )}

            {error && (
              <p className="modal-error">
                {error}
              </p>
            )}

            <div className="modal-acciones importar-acciones">

              <span className="importar-resumen-total">
                {seleccionadas.length} seleccionado
                {seleccionadas.length === 1 ? "" : "s"} ·{" "}
                {formatearMonto(totalSeleccionado)}
                {idsABorrar.length > 0 &&
                  ` · se borran ${idsABorrar.length}`}
              </span>

              <button
                type="button"
                className="boton-cancelar"
                onClick={() => {
                  setResumen(null);
                  setFilas([]);
                  setError("");
                }}
              >
                Otro PDF
              </button>

              <button
                type="button"
                className="boton-guardar"
                onClick={importar}
                disabled={seleccionadas.length === 0}
              >
                Agregar a la grilla
              </button>

            </div>

          </>

        )}

      </div>

    </div>
  );
};

export default ImportarResumen;
