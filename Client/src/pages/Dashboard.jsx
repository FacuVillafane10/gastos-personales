import "../styles/dashboard.css";
import { useEffect, useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import {
  crearOrigen,
  obtenerResumenMensual,
  obtenerUsuarioActual,
  cerrarSesion,
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

const Dashboard = () => {
  const fechaActual = new Date();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [anio, setAnio] = useState(
    fechaActual.getFullYear()
  );

  const [mes, setMes] = useState(
    fechaActual.getMonth() + 1
  );

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
  // NAVEGACIÓN ENTRE MESES
  // =========================

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);

      setAnio(
        (anioActual) => anioActual - 1
      );

      return;
    }

    setMes(
      (mesActual) => mesActual - 1
    );
  };

  const mesSiguiente = () => {
    if (mes === 12) {
      setMes(1);

      setAnio(
        (anioActual) => anioActual + 1
      );

      return;
    }

    setMes(
      (mesActual) => mesActual + 1
    );
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

              <button
                type="button"
                className="boton-agregar"
                onClick={abrirModal}
              >
                + Agregar
              </button>

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

    </main>
  );
};

export default Dashboard;