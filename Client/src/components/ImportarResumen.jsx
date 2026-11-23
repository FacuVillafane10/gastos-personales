import { useState } from "react";

import CampoPassword from "./CampoPassword";

import {
  armarGastos,
  ErrorClave,
  extraerLineas,
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
// gasto; los consumos en dólares quedan sin marcar para revisarlos.
const preparaFilas = (movimientos) =>
  movimientos.map((movimiento, indice) => ({
    ...movimiento,
    clave: indice,
    seleccionado: ["consumo", "cuota", "impuesto"].includes(
      movimiento.tipo
    ),
    montoCarga: Math.abs(movimiento.monto),
    categoriaId: "",
  }));

const ImportarResumen = ({
  anio,
  mes,
  nombreMes,
  categorias,
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

      setFilas(preparaFilas(leido.movimientos));
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

  const seleccionadas = filas.filter(
    (fila) => fila.seleccionado
  );

  const totalSeleccionado = seleccionadas.reduce(
    (suma, fila) => suma + (Number(fila.montoCarga) || 0),
    0
  );

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
      })
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
              Marcá los movimientos que querés cargar. Los
              consumos en dólares quedan sin marcar: si los
              cargás, poné el importe en pesos. La fecha de
              compra queda en las observaciones.
            </p>

            {diferenciaControl !== null && (
              <p
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
              </p>
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

                      <td>
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

                      <td>
                        <span className="importar-descripcion">
                          {fila.descripcion}
                        </span>

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

                      <td>
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

                      <td>
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
