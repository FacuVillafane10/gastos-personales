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
  cargarCuotasSiguientes,
  crearCategoria,
  guardarCambiosGastos,
  obtenerCategorias,
  obtenerGastosMensuales,
  obtenerOrigen,
} from "../services/api";

import {
  emparejarPorDescripcion,
  generarCopias,
} from "../utils/copiarGastos";

import { obtenerFechaSugerida } from "../utils/fechas";

import ConfirmarSalida from "../components/ConfirmarSalida";
import ImportarResumen from "../components/ImportarResumen";
import { useAvisoAlCerrar } from "../hooks/useAvisoAlCerrar";

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

// Una compra en cuotas está finalizada cuando la cuota actual
// es igual al total (por ejemplo 3/3).
const cuotasTerminadas = (gasto) => {
  const actual = Number(gasto.cuotaActual);

  const total = Number(gasto.cuotasTotales);

  return (
    Number.isInteger(actual) &&
    Number.isInteger(total) &&
    total > 0 &&
    actual === total
  );
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
  // MODAL COPIAR DE OTRO MES
  // ============================

  const mesAnterior =
    mes === 1 ? 12 : mes - 1;

  const anioMesAnterior =
    mes === 1 ? anio - 1 : anio;

  const [modalCopia, setModalCopia] =
    useState(false);

  const [mesOrigen, setMesOrigen] =
    useState(mesAnterior);

  const [anioOrigen, setAnioOrigen] =
    useState(anioMesAnterior);

  const [errorCopia, setErrorCopia] =
    useState("");

  const [copiando, setCopiando] =
    useState(false);

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

          pagado: gasto.pagado === true,

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
  // AGREGAR FILAS COPIADAS O IMPORTADAS
  // ============================

  // Agrega filas sin guardar a la grilla (copiadas o importadas). Si
  // ya existe una fila con la misma descripción, se pisa con los datos
  // nuevos; las demás se agregan como filas nuevas. Devuelve el
  // detalle de nuevos/actualizados para el mensaje.
  const incorporarFilas = (nuevas) => {
    const filas = [...gastos];

    let actualizados = 0;

    let agregados = 0;

    for (const {
      copia,
      existente,
    } of emparejarPorDescripcion(
      nuevas,
      gastos
    )) {
      if (!existente) {
        filas.push({
          id: crypto.randomUUID(),
          ...copia,
          esNuevo: true,
          modificado: true,
        });

        agregados++;

        continue;
      }

      const indice = filas.findIndex(
        (fila) => fila.id === existente.id
      );

      filas[indice] = {
        ...existente,
        ...copia,
        modificado: true,
      };

      actualizados++;
    }

    setGastos(filas);

    setError("");

    return actualizados > 0
      ? ` (${agregados} nuevo${
          agregados === 1 ? "" : "s"
        } y ${actualizados} actualizado${
          actualizados === 1 ? "" : "s"
        })`
      : "";
  };

  // ============================
  // IMPORTAR RESUMEN PDF
  // ============================

  const [modalImportar, setModalImportar] =
    useState(false);

  // Lo que ya estaba cargado se detecta en la vista previa (queda sin
  // marcar), así que lo importado se agrega siempre como filas nuevas.
  const handleImportarResumen = (nuevos) => {
    setGastos((gastosActuales) => [
      ...gastosActuales,
      ...nuevos.map((gasto) => ({
        id: crypto.randomUUID(),
        ...gasto,
        pagado: false,
        esNuevo: true,
        modificado: true,
      })),
    ]);

    setError("");

    setMensaje(
      `Se importaron ${nuevos.length} gasto${
        nuevos.length === 1 ? "" : "s"
      } del resumen. Revisalos y tocá "Guardar cambios".`
    );

    setModalImportar(false);
  };

  // ============================
  // CARGAR CUOTAS SIGUIENTES
  // ============================

  const [cargandoCuotas, setCargandoCuotas] =
    useState(false);

  const handleCuotasSiguientes = async () => {
    if (hayCambios) {
      setMensaje("");
      setError(
        "Guardá o descartá los cambios antes de cargar las cuotas siguientes."
      );

      return;
    }

    try {
      setCargandoCuotas(true);
      setError("");
      setMensaje("");

      const resultado =
        await cargarCuotasSiguientes(
          id,
          anio,
          mes
        );

      if (resultado.gastosEnCuotas === 0) {
        setMensaje(
          "Este mes no hay gastos con cuotas pendientes."
        );
      } else if (resultado.cuotasFuturas === 0) {
        setMensaje(
          "Las cuotas siguientes ya estaban cargadas."
        );
      } else {
        setMensaje(
          `Se cargaron ${resultado.cuotasFuturas} cuota${
            resultado.cuotasFuturas === 1 ? "" : "s"
          } en los meses siguientes.`
        );
      }
    } catch (error) {
      setError(
        error.message ||
          "No se pudieron cargar las cuotas siguientes"
      );
    } finally {
      setCargandoCuotas(false);
    }
  };

  // ============================
  // COPIAR GASTOS DE OTRO MES
  // ============================

  const abrirModalCopia = () => {
    setMesOrigen(mesAnterior);
    setAnioOrigen(anioMesAnterior);
    setErrorCopia("");
    setModalCopia(true);
  };

  const cerrarModalCopia = () => {
    if (copiando) return;

    setModalCopia(false);
    setErrorCopia("");
  };

  const handleCopiarGastos = async (event) => {
    event.preventDefault();

    if (
      Number(anioOrigen) === anio &&
      Number(mesOrigen) === mes
    ) {
      setErrorCopia(
        "Elegí un mes distinto al que estás viendo."
      );

      return;
    }

    try {
      setCopiando(true);
      setErrorCopia("");

      const gastosOrigen =
        await obtenerGastosMensuales(
          id,
          Number(anioOrigen),
          Number(mesOrigen)
        );

      if (gastosOrigen.length === 0) {
        setErrorCopia(
          `No hay gastos cargados en ${
            nombresMeses[mesOrigen - 1]
          } ${anioOrigen}.`
        );

        return;
      }

      const { copias, cuotasFinalizadas } =
        generarCopias({
          gastosOrigen,
          anio,
          mes,
          anioOrigen,
          mesOrigen,
          idsCategoriasValidas: new Set(
            categorias.map(
              (categoria) => categoria.id
            )
          ),
        });

      if (copias.length === 0) {
        setErrorCopia(
          "Todos los gastos de ese mes son cuotas que ya terminaron."
        );

        return;
      }

      const detalle =
        incorporarFilas(copias);

      const aviso =
        cuotasFinalizadas > 0
          ? ` (${cuotasFinalizadas} cuota${
              cuotasFinalizadas === 1
                ? " ya finalizada no se copió"
                : "s ya finalizadas no se copiaron"
            })`
          : "";

      setMensaje(
        `Se copiaron ${copias.length} gasto${
          copias.length === 1 ? "" : "s"
        } de ${
          nombresMeses[mesOrigen - 1]
        } ${anioOrigen}${detalle}${aviso}. Revisalos y tocá "Guardar cambios".`
      );

      setModalCopia(false);
    } catch (error) {
      setErrorCopia(
        error.message ||
          "No se pudieron copiar los gastos"
      );
    } finally {
      setCopiando(false);
    }
  };

  // ============================
  // AGREGAR FILA
  // ============================

  const agregarFila = () => {
    const nuevaFila = {
      id: crypto.randomUUID(),

      // Dentro del mes que se está viendo
      fecha: obtenerFechaSugerida(anio, mes),

      descripcion: "",

      categoriaId: null,

      cuotaActual: "",

      cuotasTotales: "",

      monto: "",

      observaciones: "",

      pagado: false,

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
  // MARCAR TODOS COMO PAGADOS
  // ============================

  const marcarTodosPagados = (pagado) => {
    setGastos((gastosActuales) =>
      gastosActuales.map((gasto) =>
        gasto.pagado === pagado
          ? gasto
          : { ...gasto, pagado, modificado: true }
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

              pagado:
                gasto.pagado === true,
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

                pagado:
                  gasto.pagado === true,
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

          return true;
        }

        setGuardando(true);

        const resultado =
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

        const futuras =
          resultado?.cuotasFuturas || 0;

        setMensaje(
          futuras > 0
            ? `Cambios guardados correctamente. Se cargaron ${futuras} cuota${
                futuras === 1 ? "" : "s"
              } en los meses siguientes.`
            : "Cambios guardados correctamente"
        );

        return true;
      } catch (error) {
        setError(
          error.message
        );

        return false;
      } finally {
        setGuardando(false);
      }
    };

  // ============================
  // SALIR CON CAMBIOS SIN GUARDAR
  // ============================

  const hayCambios =
    gastos.some(
      (gasto) => gasto.modificado
    ) || eliminados.length > 0;

  useAvisoAlCerrar(hayCambios);

  const [modalSalida, setModalSalida] =
    useState(false);

  const volver = () =>
    navigate(
      `/?anio=${anio}&mes=${mes}`
    );

  const intentarVolver = () => {
    if (hayCambios) {
      setModalSalida(true);

      return;
    }

    volver();
  };

  const guardarYSalir = async () => {
    const guardado =
      await guardarCambios();

    setModalSalida(false);

    if (guardado) {
      volver();
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

  const totalPagado = gastos
    .filter((gasto) => gasto.pagado)
    .reduce(
      (acumulador, gasto) =>
        acumulador +
        (Number(gasto.monto) || 0),
      0
    );

  const totalPendiente = total - totalPagado;

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
        onClick={intentarVolver}
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

          {gastos.length > 0 && (

            <div className="movimientos-pagos">

              <small className="monto-pagado">
                Pagado{" "}
                {formatearDinero(totalPagado)}
              </small>

              <small
                className={
                  totalPendiente > 0
                    ? "monto-pendiente"
                    : "monto-pagado"
                }
              >
                {totalPendiente > 0
                  ? `Falta pagar ${formatearDinero(
                      totalPendiente
                    )}`
                  : "Todo pagado"}
              </small>

              <button
                type="button"
                className="boton-marcar-todos"
                onClick={() =>
                  marcarTodosPagados(
                    totalPendiente > 0
                  )
                }
              >
                {totalPendiente > 0
                  ? "Marcar todos como pagados"
                  : "Desmarcar todos"}
              </button>

            </div>

          )}

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
              className="boton-secundario"
              onClick={
                abrirModalCopia
              }
            >
              Copiar de otro mes
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={() =>
                setModalImportar(true)
              }
            >
              Importar resumen PDF
            </button>

            {gastos.some(
              (gasto) =>
                Number(gasto.cuotaActual) <
                Number(gasto.cuotasTotales)
            ) && (

              <button
                type="button"
                className="boton-secundario"
                onClick={
                  handleCuotasSiguientes
                }
                disabled={cargandoCuotas}
                title="Carga en los meses siguientes las cuotas que faltan de los gastos en cuotas de este mes"
              >
                {cargandoCuotas
                  ? "Cargando..."
                  : "Cargar cuotas siguientes"}
              </button>

            )}

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

            <button
              type="button"
              className="boton-secundario"
              onClick={
                abrirModalCopia
              }
            >
              Copiar de otro mes
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={() =>
                setModalImportar(true)
              }
            >
              Importar resumen PDF
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

                  <th>
                    Pagado
                  </th>

                  <th />

                </tr>

              </thead>


              <tbody>

                {gastos.map(
                  (gasto) => (

                    <tr
                      key={gasto.id}
                      className={[
                        gasto.modificado
                          ? "fila-modificada"
                          : "",
                        cuotasTerminadas(gasto)
                          ? "fila-finalizada"
                          : "",
                        gasto.pagado
                          ? "fila-pagada"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
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

                          {cuotasTerminadas(gasto) && (

                            <span
                              className="etiqueta-finalizada"
                              title="Cuotas finalizadas"
                            >
                              Final
                            </span>

                          )}

                        </div>

                      </td>


                      {/* IMPORTE */}

                      <td data-label="Importe">

                        <input
                          type="number"
                          min="0"
                          inputMode="decimal"
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


                      {/* PAGADO */}

                      <td className="celda-pagado">

                        <button
                          type="button"
                          className="boton-pagado"
                          aria-pressed={gasto.pagado}
                          title={
                            gasto.pagado
                              ? "Pagado (tocá para desmarcar)"
                              : "Marcar como pagado"
                          }
                          onClick={() =>
                            actualizarCampo(
                              gasto.id,
                              "pagado",
                              !gasto.pagado
                            )
                          }
                        >
                          <span aria-hidden="true">
                            ✓
                          </span>

                          <span className="boton-pagado-texto">
                            {gasto.pagado
                              ? "Pagado"
                              : "Sin pagar"}
                          </span>
                        </button>

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


      {/* MODAL CAMBIOS SIN GUARDAR */}

      {modalSalida && (
        <ConfirmarSalida
          guardando={guardando}
          onGuardar={guardarYSalir}
          onSalir={volver}
          onCancelar={() =>
            setModalSalida(false)
          }
        />
      )}


      {/* MODAL COPIAR DE OTRO MES */}

      {modalCopia && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  COPIAR GASTOS
                </span>

                <h2>
                  Copiar de otro mes
                </h2>

              </div>

              <button
                type="button"
                className="modal-cerrar"
                onClick={
                  cerrarModalCopia
                }
              >
                ×
              </button>

            </div>


            <p className="modal-ayuda">
              Se traen todos los gastos de
              este origen del mes elegido, a{" "}
              {nombresMeses[mes - 1]} {anio}.
              Si ya hay un gasto con la misma
              descripción, se actualiza con los
              datos del mes elegido. Podés
              revisarlos y editarlos antes de
              guardar.
            </p>


            <form
              onSubmit={
                handleCopiarGastos
              }
            >

              <div className="fila-selectores">

                <div>

                  <label
                    htmlFor="mesOrigen"
                    className="campo-label"
                  >
                    Mes
                  </label>

                  <select
                    id="mesOrigen"
                    className="campo-input"
                    value={mesOrigen}
                    onChange={(event) =>
                      setMesOrigen(
                        Number(
                          event.target.value
                        )
                      )
                    }
                  >
                    {nombresMeses.map(
                      (nombre, indice) => (
                        <option
                          key={nombre}
                          value={indice + 1}
                        >
                          {nombre}
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div>

                  <label
                    htmlFor="anioOrigen"
                    className="campo-label"
                  >
                    Año
                  </label>

                  <select
                    id="anioOrigen"
                    className="campo-input"
                    value={anioOrigen}
                    onChange={(event) =>
                      setAnioOrigen(
                        Number(
                          event.target.value
                        )
                      )
                    }
                  >
                    {[0, 1, 2, 3, 4, 5].map(
                      (resta) => (
                        <option
                          key={resta}
                          value={
                            anio + 1 - resta
                          }
                        >
                          {anio + 1 - resta}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>


              {errorCopia && (

                <p className="modal-error">
                  {errorCopia}
                </p>

              )}


              <div className="modal-acciones">

                <button
                  type="button"
                  className="boton-cancelar"
                  onClick={
                    cerrarModalCopia
                  }
                  disabled={copiando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="boton-guardar"
                  disabled={copiando}
                >
                  {copiando
                    ? "Copiando..."
                    : "Copiar gastos"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* MODAL IMPORTAR RESUMEN PDF */}

      {modalImportar && (

        <ImportarResumen
          anio={anio}
          mes={mes}
          nombreMes={nombresMeses[mes - 1]}
          categorias={categorias}
          existentes={gastos}
          onCerrar={() =>
            setModalImportar(false)
          }
          onImportar={
            handleImportarResumen
          }
        />

      )}

    </main>
  );
};

export default Movimientos;