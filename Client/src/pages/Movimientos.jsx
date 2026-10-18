import {
  useEffect,
  useState,
} from "react";
import "../styles/movimientos.css";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";

import {
  crearCategoria,
  guardarCambiosGastos,
  obtenerCategorias,
  obtenerGastosMensuales,
  obtenerOrigen,
} from "../services/api";

const nombresMeses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const formatearDinero = (valor) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
};

const Movimientos = () => {
  const { id } = useParams();

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  const fechaActual = new Date();

  const anio =
    Number(searchParams.get("anio")) ||
    fechaActual.getFullYear();

  const mes =
    Number(searchParams.get("mes")) ||
    fechaActual.getMonth() + 1;

  // ============================
  // ESTADOS
  // ============================

  const [origen, setOrigen] =
    useState(null);

  const [gastos, setGastos] =
    useState([]);

  const [eliminados, setEliminados] =
    useState([]);

  const [categorias, setCategorias] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  // ============================
  // MODAL CATEGORÍA
  // ============================

  const [modalCategoria, setModalCategoria] =
    useState(false);

  const [nuevaCategoria, setNuevaCategoria] =
    useState("");

  const [errorCategoria, setErrorCategoria] =
    useState("");

  const [
    guardandoCategoria,
    setGuardandoCategoria,
  ] = useState(false);

  // ============================
  // CARGAR DATOS
  // ============================

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [
        origenData,
        gastosData,
        categoriasData,
      ] = await Promise.all([
        obtenerOrigen(id),

        obtenerGastosMensuales(
          id,
          anio,
          mes
        ),

        obtenerCategorias(),
      ]);

      setOrigen(origenData);

      setCategorias(categoriasData);

      setGastos(
        gastosData.map((gasto) => ({
          ...gasto,

          fecha: String(
            gasto.fecha
          ).slice(0, 10),

          monto: Number(
            gasto.monto
          ),

          categoriaId:
            gasto.categoria_id,

          cuotaActual:
            gasto.cuota_actual ?? "",

          cuotasTotales:
            gasto.cuotas_totales ?? "",

          esNuevo: false,

          modificado: false,
        }))
      );

      setEliminados([]);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id, anio, mes]);

  // ============================
  // AGREGAR FILA
  // ============================

  const agregarFila = () => {
    const numeroMes =
      String(mes).padStart(2, "0");

    const nuevaFila = {
      id: crypto.randomUUID(),

      fecha: `${anio}-${numeroMes}-01`,

      descripcion: "",

      categoriaId: null,

      cuotaActual: "",

      cuotasTotales: "",

      monto: "",

      observaciones: "",

      esNuevo: true,

      modificado: true,
    };

    setGastos(
      (gastosActuales) => [
        ...gastosActuales,
        nuevaFila,
      ]
    );

    setMensaje("");
    setError("");
  };

  // ============================
  // EDITAR CELDA
  // ============================

  const actualizarCampo = (
    gastoId,
    campo,
    valor
  ) => {
    setGastos(
      (gastosActuales) =>
        gastosActuales.map(
          (gasto) => {
            if (
              gasto.id !== gastoId
            ) {
              return gasto;
            }

            return {
              ...gasto,
              [campo]: valor,
              modificado: true,
            };
          }
        )
    );

    setMensaje("");
    setError("");
  };

  // ============================
  // ELIMINAR FILA
  // ============================

  const eliminarFila = (gasto) => {
    if (!gasto.esNuevo) {
      setEliminados(
        (eliminadosActuales) => [
          ...eliminadosActuales,
          gasto.id,
        ]
      );
    }

    setGastos(
      (gastosActuales) =>
        gastosActuales.filter(
          (item) =>
            item.id !== gasto.id
        )
    );

    setMensaje("");
    setError("");
  };

  // ============================
  // VALIDAR GASTOS
  // ============================

  const validarGastos = () => {
    for (const gasto of gastos) {
      if (!gasto.fecha) {
        throw new Error(
          "Todos los gastos deben tener fecha"
        );
      }

      if (
        !gasto.descripcion.trim()
      ) {
        throw new Error(
          "Todos los gastos deben tener descripción"
        );
      }

      if (
        !Number(gasto.monto) ||
        Number(gasto.monto) <= 0
      ) {
        throw new Error(
          "Todos los gastos deben tener un importe mayor a cero"
        );
      }

      const tieneCuotaActual =
        gasto.cuotaActual !== "" &&
        gasto.cuotaActual !== null;

      const tieneCuotasTotales =
        gasto.cuotasTotales !== "" &&
        gasto.cuotasTotales !== null;

      // Si completa una parte,
      // debe completar las dos.
      if (
        tieneCuotaActual !==
        tieneCuotasTotales
      ) {
        throw new Error(
          "Si cargás cuotas, tenés que completar la cuota actual y el total de cuotas"
        );
      }

      if (
        tieneCuotaActual &&
        tieneCuotasTotales
      ) {
        const cuotaActual =
          Number(
            gasto.cuotaActual
          );

        const cuotasTotales =
          Number(
            gasto.cuotasTotales
          );

        if (
          !Number.isInteger(
            cuotaActual
          ) ||
          !Number.isInteger(
            cuotasTotales
          ) ||
          cuotaActual <= 0 ||
          cuotasTotales <= 0
        ) {
          throw new Error(
            "Las cuotas deben ser números enteros mayores a cero"
          );
        }

        if (
          cuotaActual >
          cuotasTotales
        ) {
          throw new Error(
            "La cuota actual no puede ser mayor al total de cuotas"
          );
        }
      }
    }
  };

  // ============================
  // NORMALIZAR CUOTAS
  // ============================

  const obtenerCuotas = (gasto) => {
    const sinCuotas =
      gasto.cuotaActual === "" &&
      gasto.cuotasTotales === "";

    if (sinCuotas) {
      return {
        cuotaActual: null,
        cuotasTotales: null,
      };
    }

    return {
      cuotaActual:
        Number(
          gasto.cuotaActual
        ),

      cuotasTotales:
        Number(
          gasto.cuotasTotales
        ),
    };
  };

  // ============================
  // GUARDAR GASTOS
  // ============================

  const guardarCambios =
    async () => {
      try {
        setError("");
        setMensaje("");

        validarGastos();

        const crear = gastos
          .filter(
            (gasto) =>
              gasto.esNuevo
          )
          .map((gasto) => {
            const cuotas =
              obtenerCuotas(
                gasto
              );

            return {
              fecha:
                gasto.fecha,

              descripcion:
                gasto.descripcion,

              categoriaId:
                gasto.categoriaId,

              cuotaActual:
                cuotas.cuotaActual,

              cuotasTotales:
                cuotas.cuotasTotales,

              monto:
                Number(
                  gasto.monto
                ),

              observaciones:
                gasto.observaciones,
            };
          });

        const actualizar =
          gastos
            .filter(
              (gasto) =>
                !gasto.esNuevo &&
                gasto.modificado
            )
            .map((gasto) => {
              const cuotas =
                obtenerCuotas(
                  gasto
                );

              return {
                id:
                  gasto.id,

                fecha:
                  gasto.fecha,

                descripcion:
                  gasto.descripcion,

                categoriaId:
                  gasto.categoriaId,

                cuotaActual:
                  cuotas.cuotaActual,

                cuotasTotales:
                  cuotas.cuotasTotales,

                monto:
                  Number(
                    gasto.monto
                  ),

                observaciones:
                  gasto.observaciones,
              };
            });

        if (
          crear.length === 0 &&
          actualizar.length === 0 &&
          eliminados.length === 0
        ) {
          setMensaje(
            "No hay cambios para guardar"
          );

          return;
        }

        setGuardando(true);

        await guardarCambiosGastos(
          id,
          {
            crear,
            actualizar,
            eliminar:
              eliminados,
          }
        );

        await cargarDatos();

        setMensaje(
          "Cambios guardados correctamente"
        );
      } catch (error) {
        setError(
          error.message
        );
      } finally {
        setGuardando(false);
      }
    };

  // ============================
  // DESCARTAR CAMBIOS
  // ============================

  const descartarCambios =
    async () => {
      setMensaje("");
      setError("");

      await cargarDatos();
    };

  // ============================
  // MODAL CATEGORÍA
  // ============================

  const abrirModalCategoria =
    () => {
      setNuevaCategoria("");
      setErrorCategoria("");
      setModalCategoria(true);
    };

  const cerrarModalCategoria =
    () => {
      if (
        guardandoCategoria
      ) {
        return;
      }

      setNuevaCategoria("");
      setErrorCategoria("");
      setModalCategoria(false);
    };

  // ============================
  // CREAR CATEGORÍA
  // ============================

  const handleCrearCategoria =
    async (event) => {
      event.preventDefault();

      const nombre =
        nuevaCategoria.trim();

      if (!nombre) {
        setErrorCategoria(
          "Ingresá un nombre para la categoría"
        );

        return;
      }

      try {
        setGuardandoCategoria(
          true
        );

        setErrorCategoria("");

        const categoria =
          await crearCategoria(
            nombre
          );

        setCategorias(
          (
            categoriasActuales
          ) => [
            ...categoriasActuales,
            categoria,
          ]
        );

        setNuevaCategoria("");
        setModalCategoria(false);
      } catch (error) {
        setErrorCategoria(
          error.message
        );
      } finally {
        setGuardandoCategoria(
          false
        );
      }
    };

  // ============================
  // TOTAL
  // ============================

  const total =
    gastos.reduce(
      (
        acumulador,
        gasto
      ) =>
        acumulador +
        (
          Number(
            gasto.monto
          ) || 0
        ),
      0
    );

  // ============================
  // CARGANDO
  // ============================

  if (cargando) {
    return (
      <p className="mensaje">
        Cargando movimientos...
      </p>
    );
  }

  // ============================
  // ERROR INICIAL
  // ============================

  if (
    error &&
    !origen
  ) {
    return (
      <p className="mensaje error">
        {error}
      </p>
    );
  }

  return (
    <main className="movimientos-page">

      {/* VOLVER */}

      <button
        type="button"
        className="boton-volver"
        onClick={() =>
          navigate(
            `/?anio=${anio}&mes=${mes}`
          )
        }
      >
        ← Volver
      </button>


      {/* HEADER */}

      <header className="movimientos-header">

        <div>

          <p className="dashboard-label">
            MOVIMIENTOS
          </p>

          <h1>
            {origen?.nombre}
          </h1>

          <span className="movimientos-periodo">
            {nombresMeses[mes - 1]}{" "}
            {anio}
          </span>

        </div>


        <div className="movimientos-total">

          <span>
            Total
          </span>

          <strong>
            {formatearDinero(
              total
            )}
          </strong>

        </div>

      </header>


      {/* GRILLA */}

      <section className="grilla-container">

        <div className="grilla-header">

          <h2>
            Gastos
          </h2>


          <div className="acciones-header">

            <button
              type="button"
              className="boton-secundario"
              onClick={
                abrirModalCategoria
              }
            >
              + Categoría
            </button>

            <button
              type="button"
              className="boton-agregar"
              onClick={
                agregarFila
              }
            >
              + Agregar fila
            </button>

          </div>

        </div>


        {/* SIN MOVIMIENTOS */}

        {gastos.length === 0 ? (

          <div className="sin-movimientos">

            <p>
              Todavía no hay movimientos cargados.
            </p>

            <button
              type="button"
              className="boton-agregar"
              onClick={
                agregarFila
              }
            >
              + Agregar primer gasto
            </button>

          </div>

        ) : (

          /* TABLA */

          <div className="tabla-wrapper">

            <table className="tabla-gastos">

              <thead>

                <tr>

                  <th>
                    Fecha
                  </th>

                  <th>
                    Descripción
                  </th>

                  <th>
                    Categoría
                  </th>

                  <th>
                    Cuotas
                  </th>

                  <th>
                    Importe
                  </th>

                  <th>
                    Observaciones
                  </th>

                  <th />

                </tr>

              </thead>


              <tbody>

                {gastos.map(
                  (gasto) => (

                    <tr
                      key={gasto.id}
                      className={
                        gasto.modificado
                          ? "fila-modificada"
                          : ""
                      }
                    >

                      {/* FECHA */}

                      <td data-label="Fecha">

                        <input
                          type="date"
                          value={
                            gasto.fecha
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarCampo(
                              gasto.id,
                              "fecha",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </td>


                      {/* DESCRIPCIÓN */}

                      <td data-label="Descripción">

                        <input
                          type="text"
                          value={
                            gasto.descripcion
                          }
                          placeholder="Descripción"
                          onChange={(
                            event
                          ) =>
                            actualizarCampo(
                              gasto.id,
                              "descripcion",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </td>


                      {/* CATEGORÍA */}

                      <td data-label="Categoría">

                        <select
                          value={
                            gasto.categoriaId ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarCampo(
                              gasto.id,
                              "categoriaId",
                              event
                                .target
                                .value
                                ? Number(
                                    event
                                      .target
                                      .value
                                  )
                                : null
                            )
                          }
                        >

                          <option value="">
                            Sin categoría
                          </option>

                          {categorias.map(
                            (
                              categoria
                            ) => (

                              <option
                                key={
                                  categoria.id
                                }
                                value={
                                  categoria.id
                                }
                              >
                                {
                                  categoria.nombre
                                }
                              </option>

                            )
                          )}

                        </select>

                      </td>


                      {/* CUOTAS */}

                      <td data-label="Cuotas">

                        <div className="campo-cuotas">

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              gasto.cuotaActual
                            }
                            placeholder="-"
                            onChange={(
                              event
                            ) =>
                              actualizarCampo(
                                gasto.id,
                                "cuotaActual",
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                          <span>
                            /
                          </span>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              gasto.cuotasTotales
                            }
                            placeholder="-"
                            onChange={(
                              event
                            ) =>
                              actualizarCampo(
                                gasto.id,
                                "cuotasTotales",
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                        </div>

                      </td>


                      {/* IMPORTE */}

                      <td data-label="Importe">

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            gasto.monto
                          }
                          placeholder="0"
                          onChange={(
                            event
                          ) =>
                            actualizarCampo(
                              gasto.id,
                              "monto",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </td>


                      {/* OBSERVACIONES */}

                      <td data-label="Observaciones">

                        <input
                          type="text"
                          value={
                            gasto.observaciones ||
                            ""
                          }
                          placeholder="Opcional"
                          onChange={(
                            event
                          ) =>
                            actualizarCampo(
                              gasto.id,
                              "observaciones",
                              event
                                .target
                                .value
                            )
                          }
                        />

                      </td>


                      {/* ELIMINAR */}

                      <td>

                        <button
                          type="button"
                          className="boton-eliminar"
                          onClick={() =>
                            eliminarFila(
                              gasto
                            )
                          }
                          title="Eliminar"
                        >
                          ×
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}


        {/* ERROR */}

        {error && (

          <p className="mensaje error">
            {error}
          </p>

        )}


        {/* ÉXITO */}

        {mensaje && (

          <p className="mensaje-exito">
            {mensaje}
          </p>

        )}


        {/* ACCIONES */}

        <div className="acciones-grilla">

          <button
            type="button"
            className="boton-cancelar"
            onClick={
              descartarCambios
            }
            disabled={
              guardando
            }
          >
            Descartar cambios
          </button>

          <button
            type="button"
            className="boton-guardar"
            onClick={
              guardarCambios
            }
            disabled={
              guardando
            }
          >
            {guardando
              ? "Guardando..."
              : "Guardar cambios"}
          </button>

        </div>

      </section>


      {/* MODAL CATEGORÍA */}

      {modalCategoria && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  NUEVA CATEGORÍA
                </span>

                <h2>
                  Agregar categoría
                </h2>

              </div>


              <button
                type="button"
                className="modal-cerrar"
                onClick={
                  cerrarModalCategoria
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleCrearCategoria
              }
            >

              <label
                htmlFor="nuevaCategoria"
                className="campo-label"
              >
                Nombre
              </label>


              <input
                id="nuevaCategoria"
                type="text"
                className="campo-input"
                value={
                  nuevaCategoria
                }
                placeholder="Ej: Supermercado"
                autoFocus
                onChange={(
                  event
                ) =>
                  setNuevaCategoria(
                    event
                      .target
                      .value
                  )
                }
              />


              {errorCategoria && (

                <p className="modal-error">
                  {errorCategoria}
                </p>

              )}


              <div className="modal-acciones">

                <button
                  type="button"
                  className="boton-cancelar"
                  onClick={
                    cerrarModalCategoria
                  }
                  disabled={
                    guardandoCategoria
                  }
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  className="boton-guardar"
                  disabled={
                    guardandoCategoria
                  }
                >
                  {guardandoCategoria
                    ? "Guardando..."
                    : "Guardar"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
};

export default Movimientos;