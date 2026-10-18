import "../styles/dashboard.css";
import { useEffect, useState } from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router";

import {
  crearOrigen,
  guardarCambiosGastos,
  obtenerCategorias,
  obtenerGastosMensuales,
  obtenerResumenMensual,
  obtenerUsuarioActual,
  cerrarSesion,
} from "../services/api";

import {
  emparejarPorDescripcion,
  generarCopias,
} from "../utils/copiarGastos";

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

const Dashboard = () => {
  const fechaActual = new Date();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);

  // El mes que se está viendo vive en la dirección (?anio=&mes=),
  // así se conserva al volver desde un origen o al recargar.
  const [searchParams, setSearchParams] =
    useSearchParams();

  const anioUrl = Number(
    searchParams.get("anio")
  );

  const mesUrl = Number(
    searchParams.get("mes")
  );

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

  const irAMes = (nuevoAnio, nuevoMes) => {
    setAvisoCopia("");

    setSearchParams(
      {
        anio: String(nuevoAnio),
        mes: String(nuevoMes),
      },
      { replace: true }
    );
  };

  const [resumen, setResumen] = useState(null);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");

  // Modal nuevo origen
  const [modalAbierto, setModalAbierto] =
    useState(false);

  const [nuevoOrigen, setNuevoOrigen] =
    useState("");

  const [guardandoOrigen, setGuardandoOrigen] =
    useState(false);

  const [errorOrigen, setErrorOrigen] =
    useState("");

  // Modal copiar gastos de otro mes (todos los orígenes)
  const mesPrevio = mes === 1 ? 12 : mes - 1;

  const anioPrevio = mes === 1 ? anio - 1 : anio;

  const [modalCopia, setModalCopia] =
    useState(false);

  const [pasoCopia, setPasoCopia] =
    useState("elegir");

  const [mesOrigen, setMesOrigen] =
    useState(mesPrevio);

  const [anioOrigen, setAnioOrigen] =
    useState(anioPrevio);

  const [planCopia, setPlanCopia] =
    useState([]);

  const [errorCopia, setErrorCopia] =
    useState("");

  const [procesandoCopia, setProcesandoCopia] =
    useState(false);

  const [avisoCopia, setAvisoCopia] =
    useState("");

  // =========================
  // CARGAR RESUMEN
  // =========================

  const cargarResumen = async () => {
    try {
      setCargando(true);
      setError("");

      const data = await obtenerResumenMensual(
        anio,
        mes
      );

      setResumen(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarResumen();
  }, [anio, mes]);

 useEffect(() => {
  const cargarUsuario = async () => {
    try {
      const data =
        await obtenerUsuarioActual();

      setUsuario(data);
    } catch (error) {
      console.error(
        "No se pudo obtener el usuario",
        error
      );
    }
  };

  cargarUsuario();
}, []);



const handleCerrarSesion = async () => {
  try {
    await cerrarSesion();

    navigate("/login", {
      replace: true,
    });
  } catch (error) {
    setError(
      error.message ||
        "No se pudo cerrar la sesión"
    );
  }
};
  // =========================
  // COPIAR GASTOS DE OTRO MES
  // =========================

  const abrirModalCopia = () => {
    setMesOrigen(mesPrevio);
    setAnioOrigen(anioPrevio);
    setPasoCopia("elegir");
    setPlanCopia([]);
    setErrorCopia("");
    setModalCopia(true);
  };

  const cerrarModalCopia = () => {
    if (procesandoCopia) return;

    setModalCopia(false);
    setErrorCopia("");
  };

  // Paso 1: arma la vista previa, sin guardar nada
  const revisarCopia = async (event) => {
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
      setProcesandoCopia(true);
      setErrorCopia("");

      const categorias =
        await obtenerCategorias();

      const idsCategoriasValidas = new Set(
        categorias.map(
          (categoria) => categoria.id
        )
      );

      const items = await Promise.all(
        resumen.origenes.map(
          async (origen) => {
            const [
              gastosOrigen,
              gastosDestino,
            ] = await Promise.all([
              obtenerGastosMensuales(
                origen.id,
                Number(anioOrigen),
                Number(mesOrigen)
              ),

              obtenerGastosMensuales(
                origen.id,
                anio,
                mes
              ),
            ]);

            const {
              copias,
              cuotasFinalizadas,
            } = generarCopias({
              gastosOrigen,
              anio,
              mes,
              anioOrigen,
              mesOrigen,
              idsCategoriasValidas,
            });

            const emparejadas =
              emparejarPorDescripcion(
                copias,
                gastosDestino
              );

            return {
              origen,

              tieneGastos:
                gastosOrigen.length > 0,

              cuotasFinalizadas,

              crear: emparejadas
                .filter(
                  (par) => !par.existente
                )
                .map((par) => par.copia),

              actualizar: emparejadas
                .filter(
                  (par) => par.existente
                )
                .map((par) => ({
                  id: par.existente.id,
                  ...par.copia,
                })),
            };
          }
        )
      );

      const conGastos = items.filter(
        (item) => item.tieneGastos
      );

      const totalACopiar = conGastos.reduce(
        (suma, item) =>
          suma +
          item.crear.length +
          item.actualizar.length,
        0
      );

      if (totalACopiar === 0) {
        setErrorCopia(
          conGastos.length === 0
            ? `No hay gastos cargados en ${
                nombresMeses[mesOrigen - 1]
              } ${anioOrigen}.`
            : "Todos los gastos de ese mes son cuotas que ya terminaron."
        );

        return;
      }

      setPlanCopia(conGastos);

      setPasoCopia("revisar");
    } catch (error) {
      setErrorCopia(
        error.message ||
          "No se pudo preparar la copia"
      );
    } finally {
      setProcesandoCopia(false);
    }
  };

  // Paso 2: guarda. Cada origen se guarda completo o no se guarda.
  const confirmarCopia = async () => {
    setProcesandoCopia(true);
    setErrorCopia("");

    const fallidos = [];

    let copiados = 0;

    for (const item of planCopia) {
      const cantidad =
        item.crear.length +
        item.actualizar.length;

      if (cantidad === 0) continue;

      try {
        await guardarCambiosGastos(
          item.origen.id,
          {
            crear: item.crear,
            actualizar: item.actualizar,
          }
        );

        copiados += cantidad;
      } catch (error) {
        fallidos.push(
          `${item.origen.nombre} (${
            error.message || "error"
          })`
        );
      }
    }

    await cargarResumen();

    setProcesandoCopia(false);

    if (fallidos.length > 0) {
      setPasoCopia("elegir");

      setErrorCopia(
        `No se pudo copiar en: ${fallidos.join(
          ", "
        )}. Los demás orígenes sí se copiaron; podés volver a intentar y los gastos no se duplican.`
      );

      return;
    }

    setModalCopia(false);

    setAvisoCopia(
      `Se copiaron ${copiados} gasto${
        copiados === 1 ? "" : "s"
      } de ${
        nombresMeses[mesOrigen - 1]
      } ${anioOrigen}.`
    );
  };

  const totalPlanCopia = planCopia.reduce(
    (suma, item) =>
      suma +
      item.crear.length +
      item.actualizar.length,
    0
  );

  // =========================
  // NAVEGACIÓN ENTRE MESES
  // =========================

  const mesAnterior = () => {
    if (mes === 1) {
      irAMes(anio - 1, 12);

      return;
    }

    irAMes(anio, mes - 1);
  };

  const mesSiguiente = () => {
    if (mes === 12) {
      irAMes(anio + 1, 1);

      return;
    }

    irAMes(anio, mes + 1);
  };

  // =========================
  // MODAL
  // =========================

  const abrirModal = () => {
    setNuevoOrigen("");
    setErrorOrigen("");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardandoOrigen) {
      return;
    }

    setModalAbierto(false);
    setNuevoOrigen("");
    setErrorOrigen("");
  };

  // =========================
  // CREAR ORIGEN
  // =========================

  const handleCrearOrigen = async (event) => {
    event.preventDefault();

    const nombre = nuevoOrigen.trim();

    if (!nombre) {
      setErrorOrigen(
        "Ingresá un nombre para el origen"
      );

      return;
    }

    try {
      setGuardandoOrigen(true);
      setErrorOrigen("");

      await crearOrigen(nombre);

      setNuevoOrigen("");
      setModalAbierto(false);

      await cargarResumen();
    } catch (error) {
      setErrorOrigen(error.message);
    } finally {
      setGuardandoOrigen(false);
    }
  };

  return (
    <main className="dashboard">

      {/* HEADER */}

{/* HEADER */}

<header className="dashboard-header">

  <div>
    <p className="dashboard-label">
      CONTROL DE GASTOS
    </p>

    <h1>Mis gastos</h1>
  </div>

  <div className="usuario-header">

    {usuario && (
      <span className="usuario-nombre">
        {usuario.nombre}
      </span>
    )}

    <Link
      to="/cambiar-password"
      className="boton-cuenta"
    >
      🔐 Cambiar contraseña
    </Link>

    <button
      type="button"
      className="boton-cerrar-sesion"
      onClick={handleCerrarSesion}
    >
      Cerrar sesión
    </button>

  </div>

</header>


      {/* PERÍODO */}

      <section className="periodo">

        <button
          type="button"
          onClick={mesAnterior}
          className="boton-periodo"
        >
          ‹
        </button>

        <h2>
          {nombresMeses[mes - 1]} {anio}
        </h2>

        <button
          type="button"
          onClick={mesSiguiente}
          className="boton-periodo"
        >
          ›
        </button>

      </section>


      {/* CARGANDO */}

      {cargando && (
        <p className="mensaje">
          Cargando gastos...
        </p>
      )}


      {/* AVISO DE COPIA */}

      {avisoCopia && (
        <p className="aviso-copia">
          {avisoCopia}
        </p>
      )}


      {/* ERROR */}

      {error && (
        <p className="mensaje error">
          {error}
        </p>
      )}


      {/* DASHBOARD */}

      {!cargando && !error && resumen && (
        <>

          {/* TOTAL GENERAL */}

          <section className="total-card">

            <span>
              Total del mes
            </span>

            <strong>
              {formatearDinero(
                resumen.totalGeneral
              )}
            </strong>

          </section>


          {/* RESUMEN POR ORIGEN */}

          <section className="resumen">

            <div className="resumen-header">

              <h3>
                Resumen
              </h3>

              <div className="resumen-acciones">

                {resumen.origenes.length > 0 && (

                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={
                      abrirModalCopia
                    }
                  >
                    Copiar de otro mes
                  </button>

                )}

                <button
                  type="button"
                  className="boton-agregar"
                  onClick={abrirModal}
                >
                  + Agregar
                </button>

              </div>

            </div>


            <div className="origenes">

              {resumen.origenes.length === 0 ? (

                <p className="sin-datos">
                  Todavía no hay orígenes de gasto.
                </p>

              ) : (

                resumen.origenes.map(
                  (origen) => (

                    <button
                      type="button"
                      key={origen.id}
                      className="origen-card"
                      onClick={() =>
                        navigate(
                          `/origen/${origen.id}?anio=${anio}&mes=${mes}`
                        )
                      }
                    >

                      <div>

                        <span className="origen-nombre">
                          {origen.nombre}
                        </span>

                        <small>
                          Ver movimientos
                        </small>

                      </div>


                      <div className="origen-total">

                        <strong>
                          {formatearDinero(
                            origen.total
                          )}
                        </strong>

                        <span>
                          ›
                        </span>

                      </div>

                    </button>

                  )
                )

              )}

            </div>

          </section>

        </>
      )}


      {/* MODAL NUEVO ORIGEN */}

      {modalAbierto && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  NUEVO ORIGEN
                </span>

                <h2>
                  Agregar origen de gastos
                </h2>

              </div>


              <button
                type="button"
                className="modal-cerrar"
                onClick={cerrarModal}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleCrearOrigen}
            >

              <label
                htmlFor="nombreOrigen"
                className="campo-label"
              >
                Nombre
              </label>


              <input
                id="nombreOrigen"
                type="text"
                className="campo-input"
                placeholder="Ej: Banco BBVA"
                value={nuevoOrigen}
                autoFocus
                onChange={(event) =>
                  setNuevoOrigen(
                    event.target.value
                  )
                }
              />


              {errorOrigen && (

                <p className="modal-error">
                  {errorOrigen}
                </p>

              )}


              <div className="modal-acciones">

                <button
                  type="button"
                  className="boton-cancelar"
                  onClick={cerrarModal}
                  disabled={guardandoOrigen}
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  className="boton-guardar"
                  disabled={guardandoOrigen}
                >

                  {guardandoOrigen
                    ? "Guardando..."
                    : "Guardar"
                  }

                </button>

              </div>

            </form>

          </div>

        </div>

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
                  {pasoCopia === "elegir"
                    ? "Copiar de otro mes"
                    : "Revisá antes de copiar"}
                </h2>

              </div>

              <button
                type="button"
                className="modal-cerrar"
                onClick={cerrarModalCopia}
              >
                ×
              </button>

            </div>


            {pasoCopia === "elegir" ? (

              <form onSubmit={revisarCopia}>

                <p className="modal-ayuda">
                  Se traen los gastos de{" "}
                  <strong>todos tus orígenes</strong>{" "}
                  del mes elegido, a{" "}
                  {nombresMeses[mes - 1]} {anio}.
                  Si ya hay un gasto con la misma
                  descripción, se actualiza con
                  los datos del mes elegido. Antes
                  de guardar vas a ver un resumen.
                </p>

                <div className="fila-selectores">

                  <div>

                    <label
                      htmlFor="mesOrigenCopia"
                      className="campo-label"
                    >
                      Mes
                    </label>

                    <select
                      id="mesOrigenCopia"
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
                      htmlFor="anioOrigenCopia"
                      className="campo-label"
                    >
                      Año
                    </label>

                    <select
                      id="anioOrigenCopia"
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
                    onClick={cerrarModalCopia}
                    disabled={procesandoCopia}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="boton-guardar"
                    disabled={procesandoCopia}
                  >
                    {procesandoCopia
                      ? "Revisando..."
                      : "Revisar"}
                  </button>

                </div>

              </form>

            ) : (

              <>

                <p className="modal-ayuda">
                  Desde {nombresMeses[mesOrigen - 1]}{" "}
                  {anioOrigen} hacia{" "}
                  {nombresMeses[mes - 1]} {anio}:
                </p>

                <ul className="copia-lista">

                  {planCopia.map((item) => (

                    <li key={item.origen.id}>

                      <strong>
                        {item.origen.nombre}
                      </strong>

                      <span>
                        {item.crear.length} nuevo
                        {item.crear.length === 1
                          ? ""
                          : "s"}
                        {item.actualizar.length > 0 &&
                          ` · ${
                            item.actualizar.length
                          } a actualizar`}
                        {item.cuotasFinalizadas >
                          0 &&
                          ` · ${
                            item.cuotasFinalizadas
                          } cuota${
                            item.cuotasFinalizadas ===
                            1
                              ? ""
                              : "s"
                          } terminada${
                            item.cuotasFinalizadas ===
                            1
                              ? ""
                              : "s"
                          } sin copiar`}
                      </span>

                    </li>

                  ))}

                </ul>


                {errorCopia && (
                  <p className="modal-error">
                    {errorCopia}
                  </p>
                )}


                <div className="modal-acciones">

                  <button
                    type="button"
                    className="boton-cancelar"
                    onClick={() =>
                      setPasoCopia("elegir")
                    }
                    disabled={procesandoCopia}
                  >
                    Volver
                  </button>

                  <button
                    type="button"
                    className="boton-guardar"
                    onClick={confirmarCopia}
                    disabled={procesandoCopia}
                  >
                    {procesandoCopia
                      ? "Copiando..."
                      : `Copiar ${totalPlanCopia} gasto${
                          totalPlanCopia === 1
                            ? ""
                            : "s"
                        }`}
                  </button>

                </div>

              </>

            )}

          </div>

        </div>

      )}

    </main>
  );
};

export default Dashboard;