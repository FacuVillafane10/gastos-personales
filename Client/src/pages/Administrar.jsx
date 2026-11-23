import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router";

import "../styles/administrar.css";

import CampoImporte from "../components/CampoImporte";

import { formatearMonto } from "../utils/moneda";

import {
  actualizarCategoria,
  actualizarGastoFijo,
  actualizarOrigen,
  actualizarRegla,
  crearCategoria,
  crearOrigen,
  crearRegla,
  eliminarCategoria,
  eliminarGastoFijo,
  eliminarOrigen,
  eliminarRegla,
  obtenerCategorias,
  obtenerGastosFijos,
  obtenerOrigenes,
  obtenerReglas,
} from "../services/api";

const ordenarPorNombre = (lista) =>
  [...lista].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", {
      sensitivity: "base",
    })
  );

// Lista con alta, renombre y baja. Se usa para orígenes y categorías.
const ListaEditable = ({
  titulo,
  descripcion,
  placeholder,
  items,
  onCrear,
  onRenombrar,
  onPedirEliminar,
}) => {
  const [nuevo, setNuevo] = useState("");

  const [errorNuevo, setErrorNuevo] =
    useState("");

  const [creando, setCreando] = useState(false);

  const [editandoId, setEditandoId] =
    useState(null);

  const [nombreEditado, setNombreEditado] =
    useState("");

  const [errorFila, setErrorFila] = useState("");

  const [guardandoFila, setGuardandoFila] =
    useState(false);

  const crear = async (event) => {
    event.preventDefault();

    const nombre = nuevo.trim();

    if (!nombre) {
      setErrorNuevo("Escribí un nombre.");

      return;
    }

    try {
      setCreando(true);
      setErrorNuevo("");

      await onCrear(nombre);

      setNuevo("");
    } catch (error) {
      setErrorNuevo(error.message);
    } finally {
      setCreando(false);
    }
  };

  const empezarEdicion = (item) => {
    setEditandoId(item.id);
    setNombreEditado(item.nombre);
    setErrorFila("");
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setErrorFila("");
  };

  const guardarEdicion = async (event) => {
    event.preventDefault();

    const nombre = nombreEditado.trim();

    if (!nombre) {
      setErrorFila("El nombre no puede quedar vacío.");

      return;
    }

    try {
      setGuardandoFila(true);
      setErrorFila("");

      await onRenombrar(editandoId, nombre);

      setEditandoId(null);
    } catch (error) {
      setErrorFila(error.message);
    } finally {
      setGuardandoFila(false);
    }
  };

  return (
    <section className="admin-card">

      <div className="admin-encabezado">

        <h2>{titulo}</h2>

        <p>{descripcion}</p>

      </div>


      <form
        className="admin-alta"
        onSubmit={crear}
      >

        <input
          type="text"
          className="campo-input"
          placeholder={placeholder}
          maxLength={100}
          value={nuevo}
          onChange={(event) =>
            setNuevo(event.target.value)
          }
          aria-label={`Nuevo: ${titulo}`}
        />

        <button
          type="submit"
          className="boton-agregar"
          disabled={creando}
        >
          {creando ? "Agregando..." : "+ Agregar"}
        </button>

      </form>

      {errorNuevo && (
        <p className="modal-error">
          {errorNuevo}
        </p>
      )}


      {items.length === 0 ? (

        <p className="sin-datos">
          Todavía no hay ninguno.
        </p>

      ) : (

        <ul className="admin-lista">

          {items.map((item) => (

            <li key={item.id}>

              {editandoId === item.id ? (

                <form
                  className="admin-edicion"
                  onSubmit={guardarEdicion}
                >

                  <input
                    type="text"
                    className="campo-input"
                    maxLength={100}
                    value={nombreEditado}
                    autoFocus
                    onChange={(event) =>
                      setNombreEditado(
                        event.target.value
                      )
                    }
                    aria-label="Nuevo nombre"
                  />

                  <div className="admin-botones">

                    <button
                      type="button"
                      className="boton-cancelar"
                      onClick={cancelarEdicion}
                      disabled={guardandoFila}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="boton-guardar"
                      disabled={guardandoFila}
                    >
                      {guardandoFila
                        ? "Guardando..."
                        : "Guardar"}
                    </button>

                  </div>

                  {errorFila && (
                    <p className="modal-error admin-error-fila">
                      {errorFila}
                    </p>
                  )}

                </form>

              ) : (

                <div className="admin-fila">

                  <span className="admin-nombre">
                    {item.nombre}
                  </span>

                  <div className="admin-botones">

                    <button
                      type="button"
                      className="boton-secundario"
                      onClick={() =>
                        empezarEdicion(item)
                      }
                    >
                      Renombrar
                    </button>

                    <button
                      type="button"
                      className="boton-secundario boton-eliminar-item"
                      onClick={() =>
                        onPedirEliminar(item)
                      }
                    >
                      Eliminar
                    </button>

                  </div>

                </div>

              )}

            </li>

          ))}

        </ul>

      )}

    </section>
  );
};

// Formulario de una regla (alta y edición).
const FormRegla = ({
  inicial,
  categorias,
  textoBoton,
  onGuardar,
  onCancelar,
}) => {
  const [regla, setRegla] = useState(inicial);

  const [error, setError] = useState("");

  const [guardando, setGuardando] = useState(false);

  const enviar = async (event) => {
    event.preventDefault();

    try {
      setGuardando(true);
      setError("");

      await onGuardar({
        patron: regla.patron,
        nombre: regla.nombre,
        categoriaId: Number(regla.categoriaId) || null,
      });

      if (!onCancelar) {
        setRegla({ patron: "", nombre: "", categoriaId: "" });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="form-regla-admin" onSubmit={enviar}>

      <input
        type="text"
        className="campo-input"
        maxLength={100}
        placeholder="Si empieza con… (ej: TRIUNFO SEG. 402-094)"
        aria-label="Texto del banco"
        value={regla.patron}
        onChange={(event) =>
          setRegla({ ...regla, patron: event.target.value })
        }
      />

      <input
        type="text"
        className="campo-input"
        maxLength={255}
        placeholder="Llamarlo (ej: Seguro auto)"
        aria-label="Nombre"
        value={regla.nombre}
        onChange={(event) =>
          setRegla({ ...regla, nombre: event.target.value })
        }
      />

      <select
        className="campo-input"
        aria-label="Categoría"
        value={regla.categoriaId}
        onChange={(event) =>
          setRegla({ ...regla, categoriaId: event.target.value })
        }
      >
        <option value="">Sin categoría</option>

        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.nombre}
          </option>
        ))}
      </select>

      <div className="admin-botones">

        {onCancelar && (
          <button
            type="button"
            className="boton-cancelar"
            onClick={onCancelar}
            disabled={guardando}
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          className={onCancelar ? "boton-guardar" : "boton-agregar"}
          disabled={guardando}
        >
          {guardando ? "Guardando..." : textoBoton}
        </button>

      </div>

      {error && (
        <p className="modal-error admin-error-fila">
          {error}
        </p>
      )}

    </form>
  );
};

// "Si la descripción del banco empieza con ... → nombre y categoría".
// Se aplican al importar resúmenes.
// Gastos que se cargan solos cada mes. Se marcan desde Movimientos
// ("Fijo"); acá se edita el importe/día, se pausan o se borran.
const SeccionFijos = ({ fijos, onCambio }) => {
  const [editando, setEditando] = useState(null);

  const [borrandoId, setBorrandoId] = useState(null);

  const [ocupadoId, setOcupadoId] = useState(null);

  const [error, setError] = useState("");

  const ejecutar = async (id, accion) => {
    try {
      setOcupadoId(id);
      setError("");

      await accion();

      await onCambio();
    } catch (error) {
      setError(error.message);
    } finally {
      setOcupadoId(null);
    }
  };

  const guardarEdicion = (event) => {
    event.preventDefault();

    ejecutar(editando.id, async () => {
      await actualizarGastoFijo(editando.id, {
        descripcion: editando.descripcion,
        monto: Number(editando.monto),
        dia: Number(editando.dia),
      });

      setEditando(null);
    });
  };

  return (
    <section className="admin-card admin-reglas">

      <div className="admin-encabezado">

        <h2>Gastos fijos</h2>

        <p>
          Se cargan solos en cada mes al abrirlo, con el importe del
          último mes. Para agregar uno, tocá “Fijo” en el gasto desde
          Movimientos. Si lo eliminás deja de repetirse, pero los gastos
          ya cargados quedan.
        </p>

      </div>

      {error && (
        <p className="modal-error">{error}</p>
      )}

      {fijos.length === 0 ? (

        <p className="sin-datos">
          Todavía no hay ninguno.
        </p>

      ) : (

        <ul className="admin-lista">

          {fijos.map((fijo) => (

            <li key={fijo.id}>

              {editando?.id === fijo.id ? (

                <form
                  className="form-fijo"
                  onSubmit={guardarEdicion}
                >

                  <label>
                    <span>Descripción</span>

                    <input
                      type="text"
                      className="campo-input"
                      maxLength={255}
                      value={editando.descripcion}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          descripcion: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Importe</span>

                    <CampoImporte
                      className="campo-input"
                      value={editando.monto}
                      onChange={(valor) =>
                        setEditando({
                          ...editando,
                          monto: valor,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Día del mes</span>

                    <input
                      type="number"
                      className="campo-input"
                      min="1"
                      max="31"
                      inputMode="numeric"
                      value={editando.dia}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          dia: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="admin-botones">

                    <button
                      type="button"
                      className="boton-cancelar"
                      onClick={() => setEditando(null)}
                      disabled={ocupadoId === fijo.id}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="boton-guardar"
                      disabled={ocupadoId === fijo.id}
                    >
                      {ocupadoId === fijo.id
                        ? "Guardando..."
                        : "Guardar"}
                    </button>

                  </div>

                </form>

              ) : (

                <div className="admin-fila">

                  <span className="admin-nombre fijo-texto">

                    <b>{fijo.descripcion}</b>

                    {!fijo.activo && (
                      <span className="fijo-pausado">
                        Pausado
                      </span>
                    )}

                    <small>
                      {fijo.origen} · día {fijo.dia} ·{" "}
                      {formatearMonto(fijo.monto)}
                      {fijo.categoria && ` · ${fijo.categoria}`}
                    </small>

                  </span>

                  <div className="admin-botones">

                    {borrandoId === fijo.id ? (

                      <>
                        <button
                          type="button"
                          className="boton-secundario"
                          onClick={() => setBorrandoId(null)}
                        >
                          No
                        </button>

                        <button
                          type="button"
                          className="boton-secundario boton-eliminar-item"
                          disabled={ocupadoId === fijo.id}
                          onClick={() =>
                            ejecutar(fijo.id, async () => {
                              await eliminarGastoFijo(fijo.id);
                              setBorrandoId(null);
                            })
                          }
                        >
                          Sí, que no se repita
                        </button>
                      </>

                    ) : (

                      <>
                        <button
                          type="button"
                          className="boton-secundario"
                          onClick={() => {
                            setBorrandoId(null);
                            setEditando({
                              id: fijo.id,
                              descripcion: fijo.descripcion,
                              monto: fijo.monto,
                              dia: fijo.dia,
                            });
                          }}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="boton-secundario"
                          disabled={ocupadoId === fijo.id}
                          onClick={() =>
                            ejecutar(fijo.id, () =>
                              actualizarGastoFijo(fijo.id, {
                                activo: !fijo.activo,
                              })
                            )
                          }
                        >
                          {fijo.activo ? "Pausar" : "Reanudar"}
                        </button>

                        <button
                          type="button"
                          className="boton-secundario boton-eliminar-item"
                          onClick={() => setBorrandoId(fijo.id)}
                        >
                          Eliminar
                        </button>
                      </>

                    )}

                  </div>

                </div>

              )}

            </li>

          ))}

        </ul>

      )}

    </section>
  );
};

const SeccionReglas = ({ reglas, categorias, onCambio }) => {
  const [editandoId, setEditandoId] = useState(null);

  const [borrandoId, setBorrandoId] = useState(null);

  const [errorBorrar, setErrorBorrar] = useState("");

  const borrar = async (id) => {
    try {
      setErrorBorrar("");

      await eliminarRegla(id);

      setBorrandoId(null);

      await onCambio();
    } catch (error) {
      setErrorBorrar(error.message);
    }
  };

  return (
    <section className="admin-card admin-reglas">

      <div className="admin-encabezado">

        <h2>Reglas de importación</h2>

        <p>
          Cuando importás un resumen, lo que empieza con ese texto se
          carga con el nombre y la categoría que elijas. También las
          podés crear desde la vista previa con “+ regla”.
        </p>

      </div>

      <FormRegla
        inicial={{ patron: "", nombre: "", categoriaId: "" }}
        categorias={categorias}
        textoBoton="+ Agregar"
        onGuardar={async (datos) => {
          await crearRegla(datos);
          await onCambio();
        }}
      />

      {errorBorrar && (
        <p className="modal-error">{errorBorrar}</p>
      )}

      {reglas.length === 0 ? (

        <p className="sin-datos">
          Todavía no hay ninguna.
        </p>

      ) : (

        <ul className="admin-lista">

          {reglas.map((regla) => (

            <li key={regla.id}>

              {editandoId === regla.id ? (

                <FormRegla
                  inicial={{
                    patron: regla.patron,
                    nombre: regla.nombre || "",
                    categoriaId: regla.categoria_id || "",
                  }}
                  categorias={categorias}
                  textoBoton="Guardar"
                  onCancelar={() => setEditandoId(null)}
                  onGuardar={async (datos) => {
                    await actualizarRegla(regla.id, datos);
                    setEditandoId(null);
                    await onCambio();
                  }}
                />

              ) : (

                <div className="admin-fila">

                  <span className="admin-nombre regla-texto">
                    <code>{regla.patron}</code>
                    {" → "}
                    <b>{regla.nombre || "(mismo nombre)"}</b>
                    {regla.categoria && ` · ${regla.categoria}`}
                  </span>

                  <div className="admin-botones">

                    {borrandoId === regla.id ? (

                      <>
                        <button
                          type="button"
                          className="boton-secundario"
                          onClick={() => setBorrandoId(null)}
                        >
                          No
                        </button>

                        <button
                          type="button"
                          className="boton-secundario boton-eliminar-item"
                          onClick={() => borrar(regla.id)}
                        >
                          Sí, borrar
                        </button>
                      </>

                    ) : (

                      <>
                        <button
                          type="button"
                          className="boton-secundario"
                          onClick={() => {
                            setBorrandoId(null);
                            setEditandoId(regla.id);
                          }}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="boton-secundario boton-eliminar-item"
                          onClick={() => setBorrandoId(regla.id)}
                        >
                          Eliminar
                        </button>
                      </>

                    )}

                  </div>

                </div>

              )}

            </li>

          ))}

        </ul>

      )}

    </section>
  );
};

const Administrar = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [origenes, setOrigenes] = useState([]);

  const [categorias, setCategorias] =
    useState([]);

  const [reglas, setReglas] = useState([]);

  const [fijos, setFijos] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");

  // { tipo: "origen" | "categoria", item }
  const [aEliminar, setAEliminar] =
    useState(null);

  const [eliminando, setEliminando] =
    useState(false);

  const [errorEliminar, setErrorEliminar] =
    useState("");

  const cargar = useCallback(async () => {
    try {
      setError("");

      const [
        listaOrigenes,
        listaCategorias,
        listaReglas,
        listaFijos,
      ] = await Promise.all([
        obtenerOrigenes(),
        obtenerCategorias(),
        // si el servidor aún no los tiene, no se rompe la página
        obtenerReglas().catch(() => []),
        obtenerGastosFijos().catch(() => []),
      ]);

      setReglas(listaReglas);

      setFijos(listaFijos);

      setOrigenes(ordenarPorNombre(listaOrigenes));

      setCategorias(
        ordenarPorNombre(listaCategorias)
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const volver = () => {
    const anio = searchParams.get("anio");

    const mes = searchParams.get("mes");

    navigate(
      anio && mes
        ? `/?anio=${anio}&mes=${mes}`
        : "/"
    );
  };

  const confirmarEliminacion = async () => {
    try {
      setEliminando(true);
      setErrorEliminar("");

      if (aEliminar.tipo === "origen") {
        await eliminarOrigen(aEliminar.item.id);
      } else {
        await eliminarCategoria(
          aEliminar.item.id
        );
      }

      setAEliminar(null);

      await cargar();
    } catch (error) {
      setErrorEliminar(error.message);
    } finally {
      setEliminando(false);
    }
  };

  if (cargando) {
    return (
      <p className="mensaje">
        Cargando...
      </p>
    );
  }

  return (
    <main className="admin-page">

      <button
        type="button"
        className="boton-volver"
        onClick={volver}
      >
        ← Volver
      </button>

      <header className="admin-header">

        <p className="dashboard-label">
          CONFIGURACIÓN
        </p>

        <h1>Orígenes, categorías y reglas</h1>

      </header>

      {error && (
        <p className="mensaje error">
          {error}
        </p>
      )}

      <div className="admin-grilla">

        <ListaEditable
          titulo="Orígenes"
          descripcion="Bancos, tarjetas o efectivo desde donde salen tus gastos."
          placeholder="Ej: Tarjeta Visa"
          items={origenes}
          onCrear={async (nombre) => {
            await crearOrigen(nombre);
            await cargar();
          }}
          onRenombrar={async (id, nombre) => {
            await actualizarOrigen(id, nombre);
            await cargar();
          }}
          onPedirEliminar={(item) => {
            setErrorEliminar("");
            setAEliminar({
              tipo: "origen",
              item,
            });
          }}
        />

        <ListaEditable
          titulo="Categorías"
          descripcion="Sirven para ver en qué se va la plata."
          placeholder="Ej: Supermercado"
          items={categorias}
          onCrear={async (nombre) => {
            await crearCategoria(nombre);
            await cargar();
          }}
          onRenombrar={async (id, nombre) => {
            await actualizarCategoria(id, nombre);
            await cargar();
          }}
          onPedirEliminar={(item) => {
            setErrorEliminar("");
            setAEliminar({
              tipo: "categoria",
              item,
            });
          }}
        />

      </div>

      <SeccionFijos
        fijos={fijos}
        onCambio={cargar}
      />

      <SeccionReglas
        reglas={reglas}
        categorias={categorias}
        onCambio={cargar}
      />


      {aEliminar && (

        <div className="modal-overlay">

          <div
            className="modal"
            role="alertdialog"
            aria-labelledby="tituloEliminar"
          >

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  {aEliminar.tipo === "origen"
                    ? "ELIMINAR ORIGEN"
                    : "ELIMINAR CATEGORÍA"}
                </span>

                <h2 id="tituloEliminar">
                  ¿Eliminar “{aEliminar.item.nombre}”?
                </h2>

              </div>

            </div>

            <p className="modal-ayuda">
              {aEliminar.tipo === "origen"
                ? "Sus gastos quedan guardados pero dejan de sumar en los totales y en el resumen. Si más adelante creás un origen con el mismo nombre, se recupera con sus gastos."
                : "Los gastos quedan guardados y siguen apareciendo con su nombre en el gráfico. Ya no vas a poder elegirla en gastos nuevos. Si más adelante creás una categoría con el mismo nombre, se recupera."}
            </p>

            {errorEliminar && (
              <p className="modal-error">
                {errorEliminar}
              </p>
            )}

            <div className="modal-acciones">

              <button
                type="button"
                className="boton-cancelar"
                onClick={() => setAEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="boton-guardar boton-peligro"
                onClick={confirmarEliminacion}
                disabled={eliminando}
              >
                {eliminando
                  ? "Eliminando..."
                  : "Eliminar"}
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
};

export default Administrar;
