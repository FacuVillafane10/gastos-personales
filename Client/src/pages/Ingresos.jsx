import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router";

import "../styles/movimientos.css";
import "../styles/ingresos.css";

import {
  guardarCambiosIngresos,
  obtenerIngresosMensuales,
} from "../services/api";

import { emparejarPorDescripcion } from "../utils/copiarGastos";
import { obtenerFechaSugerida } from "../utils/fechas";

import ConfirmarSalida from "../components/ConfirmarSalida";
import CampoImporte from "../components/CampoImporte";
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

const Ingresos = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const fechaActual = new Date();

  const anioUrl = Number(searchParams.get("anio"));

  const mesUrl = Number(searchParams.get("mes"));

  const anio =
    Number.isInteger(anioUrl) &&
    anioUrl >= 2000 &&
    anioUrl <= 2100
      ? anioUrl
      : fechaActual.getFullYear();

  const mes =
    Number.isInteger(mesUrl) &&
    mesUrl >= 1 &&
    mesUrl <= 12
      ? mesUrl
      : fechaActual.getMonth() + 1;

  // ============================
  // ESTADOS
  // ============================

  const [ingresos, setIngresos] = useState([]);

  const [eliminados, setEliminados] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");

  // Modal copiar de otro mes
  const mesPrevio = mes === 1 ? 12 : mes - 1;

  const anioPrevio = mes === 1 ? anio - 1 : anio;

  const [modalCopia, setModalCopia] =
    useState(false);

  const [mesOrigen, setMesOrigen] =
    useState(mesPrevio);

  const [anioOrigen, setAnioOrigen] =
    useState(anioPrevio);

  const [errorCopia, setErrorCopia] =
    useState("");

  const [copiando, setCopiando] =
    useState(false);

  // ============================
  // CARGAR DATOS
  // ============================

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const data =
        await obtenerIngresosMensuales(
          anio,
          mes
        );

      setIngresos(
        data.map((ingreso) => ({
          ...ingreso,

          fecha: String(ingreso.fecha).slice(
            0,
            10
          ),

          monto: Number(ingreso.monto),

          observaciones:
            ingreso.observaciones || "",

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
  }, [anio, mes]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ============================
  // EDICIÓN DE FILAS
  // ============================

  const agregarFila = () => {
    setIngresos((actuales) => [
      ...actuales,
      {
        id: crypto.randomUUID(),
        fecha: obtenerFechaSugerida(anio, mes),
        descripcion: "",
        monto: "",
        observaciones: "",
        esNuevo: true,
        modificado: true,
      },
    ]);

    setMensaje("");
    setError("");
  };

  const actualizarCampo = (
    ingresoId,
    campo,
    valor
  ) => {
    setIngresos((actuales) =>
      actuales.map((ingreso) =>
        ingreso.id === ingresoId
          ? {
              ...ingreso,
              [campo]: valor,
              modificado: true,
            }
          : ingreso
      )
    );

    setMensaje("");
    setError("");
  };

  const eliminarFila = (ingreso) => {
    if (!ingreso.esNuevo) {
      setEliminados((actuales) => [
        ...actuales,
        ingreso.id,
      ]);
    }

    setIngresos((actuales) =>
      actuales.filter(
        (fila) => fila.id !== ingreso.id
      )
    );

    setMensaje("");
    setError("");
  };

  // ============================
  // GUARDAR
  // ============================

  const validarIngresos = () => {
    for (const ingreso of ingresos) {
      if (!ingreso.fecha) {
        throw new Error(
          "Todos los ingresos deben tener fecha"
        );
      }

      if (!ingreso.descripcion.trim()) {
        throw new Error(
          "Todos los ingresos deben tener descripción"
        );
      }

      if (
        !Number(ingreso.monto) ||
        Number(ingreso.monto) <= 0
      ) {
        throw new Error(
          "Todos los ingresos deben tener un importe mayor a cero"
        );
      }
    }
  };

  const aPayload = (ingreso) => ({
    fecha: ingreso.fecha,
    descripcion: ingreso.descripcion,
    monto: Number(ingreso.monto),
    observaciones: ingreso.observaciones,
  });

  const guardarCambios = async () => {
    try {
      setError("");
      setMensaje("");

      validarIngresos();

      const crear = ingresos
        .filter((ingreso) => ingreso.esNuevo)
        .map(aPayload);

      const actualizar = ingresos
        .filter(
          (ingreso) =>
            !ingreso.esNuevo &&
            ingreso.modificado
        )
        .map((ingreso) => ({
          id: ingreso.id,
          ...aPayload(ingreso),
        }));

      if (
        crear.length === 0 &&
        actualizar.length === 0 &&
        eliminados.length === 0
      ) {
        setMensaje("No hay cambios para guardar");

        return true;
      }

      setGuardando(true);

      await guardarCambiosIngresos({
        crear,
        actualizar,
        eliminar: eliminados,
      });

      await cargarDatos();

      setMensaje(
        "Cambios guardados correctamente"
      );

      return true;
    } catch (error) {
      setError(error.message);

      return false;
    } finally {
      setGuardando(false);
    }
  };

  // ============================
  // SALIR CON CAMBIOS SIN GUARDAR
  // ============================

  const hayCambios =
    ingresos.some(
      (ingreso) => ingreso.modificado
    ) || eliminados.length > 0;

  useAvisoAlCerrar(hayCambios);

  const [modalSalida, setModalSalida] =
    useState(false);

  const volver = () =>
    navigate(`/?anio=${anio}&mes=${mes}`);

  const intentarVolver = () => {
    if (hayCambios) {
      setModalSalida(true);

      return;
    }

    volver();
  };

  const guardarYSalir = async () => {
    const guardado = await guardarCambios();

    setModalSalida(false);

    if (guardado) {
      volver();
    }
  };

  const descartarCambios = async () => {
    setMensaje("");
    setError("");

    await cargarDatos();
  };

  // ============================
  // COPIAR DE OTRO MES
  // ============================

  const abrirModalCopia = () => {
    setMesOrigen(mesPrevio);
    setAnioOrigen(anioPrevio);
    setErrorCopia("");
    setModalCopia(true);
  };

  const cerrarModalCopia = () => {
    if (copiando) return;

    setModalCopia(false);
    setErrorCopia("");
  };

  const handleCopiar = async (event) => {
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

      const origen =
        await obtenerIngresosMensuales(
          Number(anioOrigen),
          Number(mesOrigen)
        );

      if (origen.length === 0) {
        setErrorCopia(
          `No hay ingresos cargados en ${
            nombresMeses[mesOrigen - 1]
          } ${anioOrigen}.`
        );

        return;
      }

      const diasDelMes = new Date(
        anio,
        mes,
        0
      ).getDate();

      const copias = origen.map((ingreso) => {
        const dia = Math.min(
          Number(
            String(ingreso.fecha).slice(8, 10)
          ) || 1,
          diasDelMes
        );

        return {
          fecha: `${anio}-${String(mes).padStart(
            2,
            "0"
          )}-${String(dia).padStart(2, "0")}`,

          descripcion: ingreso.descripcion,

          monto: Number(ingreso.monto),

          observaciones:
            ingreso.observaciones || "",
        };
      });

      // Si ya hay un ingreso con la misma descripción, se pisa
      const filas = [...ingresos];

      let agregados = 0;

      let actualizados = 0;

      for (const {
        copia,
        existente,
      } of emparejarPorDescripcion(
        copias,
        ingresos
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

      setIngresos(filas);

      setError("");

      setMensaje(
        `Se copiaron ${copias.length} ingreso${
          copias.length === 1 ? "" : "s"
        } de ${
          nombresMeses[mesOrigen - 1]
        } ${anioOrigen}${
          actualizados > 0
            ? ` (${agregados} nuevo${
                agregados === 1 ? "" : "s"
              } y ${actualizados} actualizado${
                actualizados === 1 ? "" : "s"
              })`
            : ""
        }. Revisalos y tocá "Guardar cambios".`
      );

      setModalCopia(false);
    } catch (error) {
      setErrorCopia(
        error.message ||
          "No se pudieron copiar los ingresos"
      );
    } finally {
      setCopiando(false);
    }
  };

  // ============================
  // TOTAL
  // ============================

  const total = ingresos.reduce(
    (acumulador, ingreso) =>
      acumulador +
      (Number(ingreso.monto) || 0),
    0
  );

  // ============================
  // RENDER
  // ============================

  if (cargando) {
    return (
      <p className="mensaje">
        Cargando ingresos...
      </p>
    );
  }

  return (
    <main className="movimientos-page">

      <button
        type="button"
        className="boton-volver"
        onClick={intentarVolver}
      >
        ← Volver
      </button>


      <header className="movimientos-header">

        <div>

          <p className="dashboard-label">
            INGRESOS
          </p>

          <h1>Ingresos</h1>

          <p className="movimientos-periodo">
            {nombresMeses[mes - 1]} {anio}
          </p>

        </div>

        <div className="movimientos-total total-ingresos">

          <span>Total</span>

          <strong>
            {formatearDinero(total)}
          </strong>

        </div>

      </header>


      <section className="grilla-container">

        <div className="grilla-header">

          <h2>Lo que entra</h2>

          <div className="acciones-header">

            <button
              type="button"
              className="boton-secundario"
              onClick={abrirModalCopia}
            >
              Copiar de otro mes
            </button>

            <button
              type="button"
              className="boton-agregar"
              onClick={agregarFila}
            >
              + Agregar fila
            </button>

          </div>

        </div>


        {ingresos.length === 0 ? (

          <div className="sin-movimientos">

            <p>
              Todavía no hay ingresos cargados.
            </p>

            <button
              type="button"
              className="boton-agregar"
              onClick={agregarFila}
            >
              + Agregar primer ingreso
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={abrirModalCopia}
            >
              Copiar de otro mes
            </button>

          </div>

        ) : (

          <div className="tabla-wrapper">

            <table className="tabla-gastos tabla-ingresos">

              <thead>

                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Importe</th>
                  <th>Observaciones</th>
                  <th />
                </tr>

              </thead>

              <tbody>

                {ingresos.map((ingreso) => (

                  <tr
                    key={ingreso.id}
                    className={
                      ingreso.modificado
                        ? "fila-modificada"
                        : ""
                    }
                  >

                    <td data-label="Fecha">

                      <input
                        type="date"
                        value={ingreso.fecha}
                        onChange={(event) =>
                          actualizarCampo(
                            ingreso.id,
                            "fecha",
                            event.target.value
                          )
                        }
                      />

                    </td>

                    <td data-label="Descripción">

                      <input
                        type="text"
                        value={
                          ingreso.descripcion
                        }
                        placeholder="Ej: Sueldo"
                        onChange={(event) =>
                          actualizarCampo(
                            ingreso.id,
                            "descripcion",
                            event.target.value
                          )
                        }
                      />

                    </td>

                    <td data-label="Importe">

                      <CampoImporte
                        value={ingreso.monto}
                        placeholder="0"
                        aria-label="Importe"
                        onChange={(valor) =>
                          actualizarCampo(
                            ingreso.id,
                            "monto",
                            valor
                          )
                        }
                      />

                    </td>

                    <td data-label="Observaciones">

                      <input
                        type="text"
                        value={
                          ingreso.observaciones
                        }
                        placeholder="Opcional"
                        onChange={(event) =>
                          actualizarCampo(
                            ingreso.id,
                            "observaciones",
                            event.target.value
                          )
                        }
                      />

                    </td>

                    <td>

                      <button
                        type="button"
                        className="boton-eliminar"
                        onClick={() =>
                          eliminarFila(ingreso)
                        }
                        title="Eliminar"
                      >
                        ×
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}


        {error && (
          <p className="mensaje error">
            {error}
          </p>
        )}

        {mensaje && (
          <p className="mensaje-exito">
            {mensaje}
          </p>
        )}


        <div className="acciones-grilla">

          <button
            type="button"
            className="boton-cancelar"
            onClick={descartarCambios}
            disabled={guardando}
          >
            Descartar cambios
          </button>

          <button
            type="button"
            className="boton-guardar"
            onClick={guardarCambios}
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : "Guardar cambios"}
          </button>

        </div>

      </section>


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

      {modalCopia && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  COPIAR INGRESOS
                </span>

                <h2>Copiar de otro mes</h2>

              </div>

              <button
                type="button"
                className="modal-cerrar"
                onClick={cerrarModalCopia}
              >
                ×
              </button>

            </div>

            <p className="modal-ayuda">
              Se traen los ingresos del mes
              elegido a {nombresMeses[mes - 1]}{" "}
              {anio}. Si ya hay un ingreso con la
              misma descripción, se actualiza con
              los datos del mes elegido. Podés
              revisarlos antes de guardar.
            </p>

            <form onSubmit={handleCopiar}>

              <div className="fila-selectores">

                <div>

                  <label
                    htmlFor="mesOrigenIngreso"
                    className="campo-label"
                  >
                    Mes
                  </label>

                  <select
                    id="mesOrigenIngreso"
                    className="campo-input"
                    value={mesOrigen}
                    onChange={(event) =>
                      setMesOrigen(
                        Number(event.target.value)
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
                    htmlFor="anioOrigenIngreso"
                    className="campo-label"
                  >
                    Año
                  </label>

                  <select
                    id="anioOrigenIngreso"
                    className="campo-input"
                    value={anioOrigen}
                    onChange={(event) =>
                      setAnioOrigen(
                        Number(event.target.value)
                      )
                    }
                  >
                    {[0, 1, 2, 3, 4, 5].map(
                      (resta) => (
                        <option
                          key={resta}
                          value={anio + 1 - resta}
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
                  onClick={cerrarModalCopia}
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
                    : "Copiar ingresos"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
};

export default Ingresos;
