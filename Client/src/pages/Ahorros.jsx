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
import "../styles/ahorros.css";

import {
  guardarCambiosAhorros,
  obtenerAhorrosMensuales,
} from "../services/api";

import { obtenerFechaSugerida } from "../utils/fechas";
import { formatearMonto } from "../utils/moneda";

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

const MONEDAS = [
  { valor: "ARS", etiqueta: "Pesos", corta: "ARS" },
  { valor: "USD", etiqueta: "Dólares", corta: "USD" },
];

// Depósitos suman y retiros restan, por moneda
const calcularNeto = (movimientos) => {
  const neto = { ARS: 0, USD: 0 };

  for (const movimiento of movimientos) {
    const monto = Number(movimiento.monto) || 0;

    if (!(movimiento.moneda in neto)) continue;

    neto[movimiento.moneda] +=
      movimiento.tipo === "retiro"
        ? -monto
        : monto;
  }

  return neto;
};

const Ahorros = () => {
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

  const [movimientos, setMovimientos] =
    useState([]);

  const [acumuladoAnterior, setAcumuladoAnterior] =
    useState({ ARS: 0, USD: 0 });

  const [eliminados, setEliminados] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");

  const [modalSalida, setModalSalida] =
    useState(false);

  // ============================
  // CARGAR DATOS
  // ============================

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const data =
        await obtenerAhorrosMensuales(anio, mes);

      setMovimientos(
        data.movimientos.map((movimiento) => ({
          ...movimiento,

          fecha: String(movimiento.fecha).slice(
            0,
            10
          ),

          monto: Number(movimiento.monto),

          montoPesos:
            movimiento.monto_pesos ?? "",

          observaciones:
            movimiento.observaciones || "",

          esNuevo: false,

          modificado: false,
        }))
      );

      setAcumuladoAnterior(
        data.acumuladoAnterior || {
          ARS: 0,
          USD: 0,
        }
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

  const agregarFila = (tipo = "deposito") => {
    setMovimientos((actuales) => [
      ...actuales,
      {
        id: crypto.randomUUID(),
        fecha: obtenerFechaSugerida(anio, mes),
        tipo,
        // la compra de dólares siempre es en dólares
        moneda: tipo === "compra_usd" ? "USD" : "ARS",
        descripcion:
          tipo === "compra_usd"
            ? "Compra de dólares"
            : "",
        monto: "",
        montoPesos: "",
        observaciones: "",
        esNuevo: true,
        modificado: true,
      },
    ]);

    setMensaje("");
    setError("");
  };

  const actualizarCampo = (
    movimientoId,
    campo,
    valor
  ) => {
    setMovimientos((actuales) =>
      actuales.map((movimiento) => {
        if (movimiento.id !== movimientoId) {
          return movimiento;
        }

        const actualizado = {
          ...movimiento,
          [campo]: valor,
          modificado: true,
        };

        if (campo === "tipo") {
          if (valor === "compra_usd") {
            actualizado.moneda = "USD";
          } else {
            actualizado.montoPesos = "";
          }
        }

        return actualizado;
      })
    );

    setMensaje("");
    setError("");
  };

  const eliminarFila = (movimiento) => {
    if (!movimiento.esNuevo) {
      setEliminados((actuales) => [
        ...actuales,
        movimiento.id,
      ]);
    }

    setMovimientos((actuales) =>
      actuales.filter(
        (fila) => fila.id !== movimiento.id
      )
    );

    setMensaje("");
    setError("");
  };

  // ============================
  // GUARDAR
  // ============================

  const validar = () => {
    for (const movimiento of movimientos) {
      if (!movimiento.fecha) {
        throw new Error(
          "Todos los movimientos deben tener fecha"
        );
      }

      if (!movimiento.descripcion.trim()) {
        throw new Error(
          "Todos los movimientos deben tener descripción"
        );
      }

      if (
        !Number(movimiento.monto) ||
        Number(movimiento.monto) <= 0
      ) {
        throw new Error(
          "Todos los movimientos deben tener un importe mayor a cero"
        );
      }

      if (
        movimiento.tipo === "compra_usd" &&
        (!Number(movimiento.montoPesos) ||
          Number(movimiento.montoPesos) <= 0)
      ) {
        throw new Error(
          "En cada compra de dólares indicá los pesos que pagaste"
        );
      }
    }
  };

  const aPayload = (movimiento) => ({
    fecha: movimiento.fecha,
    tipo: movimiento.tipo,
    moneda: movimiento.moneda,
    descripcion: movimiento.descripcion,
    monto: Number(movimiento.monto),
    montoPesos:
      movimiento.tipo === "compra_usd"
        ? Number(movimiento.montoPesos)
        : null,
    observaciones: movimiento.observaciones,
  });

  const guardarCambios = async () => {
    try {
      setError("");
      setMensaje("");

      validar();

      const crear = movimientos
        .filter((movimiento) => movimiento.esNuevo)
        .map(aPayload);

      const actualizar = movimientos
        .filter(
          (movimiento) =>
            !movimiento.esNuevo &&
            movimiento.modificado
        )
        .map((movimiento) => ({
          id: movimiento.id,
          ...aPayload(movimiento),
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

      await guardarCambiosAhorros({
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

  const descartarCambios = async () => {
    setMensaje("");
    setError("");

    await cargarDatos();
  };

  // ============================
  // SALIR CON CAMBIOS SIN GUARDAR
  // ============================

  const hayCambios =
    movimientos.some(
      (movimiento) => movimiento.modificado
    ) || eliminados.length > 0;

  useAvisoAlCerrar(hayCambios);

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

  // ============================
  // TOTALES (se actualizan mientras editás)
  // ============================

  const netoMes = calcularNeto(movimientos);

  const pesosCompraMes = movimientos
    .filter(
      (movimiento) =>
        movimiento.tipo === "compra_usd"
    )
    .reduce(
      (suma, movimiento) =>
        suma + (Number(movimiento.montoPesos) || 0),
      0
    );

  const acumulado = {
    ARS: acumuladoAnterior.ARS + netoMes.ARS,
    USD: acumuladoAnterior.USD + netoMes.USD,
  };

  // ============================
  // RENDER
  // ============================

  if (cargando) {
    return (
      <p className="mensaje">
        Cargando ahorros...
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
            AHORROS
          </p>

          <h1>Ahorros</h1>

          <p className="movimientos-periodo">
            {nombresMeses[mes - 1]} {anio}
          </p>

        </div>

      </header>


      <section
        className="ahorro-totales"
        aria-label="Totales de ahorro"
      >

        {MONEDAS.map(({ valor, etiqueta }) => (

          <div
            key={valor}
            className="ahorro-total-card"
          >

            <span className="ahorro-moneda">
              {etiqueta}
            </span>

            <strong>
              {formatearMonto(acumulado[valor], valor)}
            </strong>

            <small>Total ahorrado</small>

            <p
              className={
                netoMes[valor] < 0
                  ? "ahorro-mes ahorro-mes-negativo"
                  : "ahorro-mes"
              }
            >
              {netoMes[valor] > 0 ? "+" : ""}
              {formatearMonto(netoMes[valor], valor)}{" "}
              en {nombresMeses[mes - 1].toLowerCase()}
            </p>

            {valor === "ARS" && pesosCompraMes > 0 && (
              <p className="ahorro-compra">
                {formatearMonto(pesosCompraMes, "ARS")}{" "}
                usados para comprar dólares
              </p>
            )}

          </div>

        ))}

      </section>


      <section className="grilla-container">

        <div className="grilla-header">

          <h2>Movimientos</h2>

          <div className="acciones-header">

            <button
              type="button"
              className="boton-secundario"
              onClick={() => agregarFila("retiro")}
            >
              − Retiro
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={() =>
                agregarFila("compra_usd")
              }
            >
              Compra de US$
            </button>

            <button
              type="button"
              className="boton-agregar"
              onClick={() => agregarFila("deposito")}
            >
              + Depósito
            </button>

          </div>

        </div>


        {movimientos.length === 0 ? (

          <div className="sin-movimientos">

            <p>
              Todavía no hay movimientos de ahorro
              este mes.
            </p>

            <button
              type="button"
              className="boton-agregar"
              onClick={() => agregarFila("deposito")}
            >
              + Agregar primer depósito
            </button>

          </div>

        ) : (

          <div className="tabla-wrapper">

            <table className="tabla-gastos tabla-ahorros">

              <thead>

                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Moneda</th>
                  <th>Descripción</th>
                  <th>Importe</th>
                  <th>Pesos pagados</th>
                  <th>Observaciones</th>
                  <th />
                </tr>

              </thead>

              <tbody>

                {movimientos.map((movimiento) => (

                  <tr
                    key={movimiento.id}
                    className={[
                      movimiento.modificado
                        ? "fila-modificada"
                        : "",
                      movimiento.tipo === "retiro"
                        ? "fila-retiro"
                        : "",
                      movimiento.tipo === "compra_usd"
                        ? "fila-compra"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >

                    <td data-label="Fecha">

                      <input
                        type="date"
                        value={movimiento.fecha}
                        onChange={(event) =>
                          actualizarCampo(
                            movimiento.id,
                            "fecha",
                            event.target.value
                          )
                        }
                      />

                    </td>

                    <td data-label="Tipo">

                      <select
                        value={movimiento.tipo}
                        onChange={(event) =>
                          actualizarCampo(
                            movimiento.id,
                            "tipo",
                            event.target.value
                          )
                        }
                      >
                        <option value="deposito">
                          Depósito
                        </option>
                        <option value="retiro">
                          Retiro
                        </option>
                        <option value="compra_usd">
                          Compra US$
                        </option>
                      </select>

                    </td>

                    <td data-label="Moneda">

                      <select
                        value={movimiento.moneda}
                        disabled={
                          movimiento.tipo ===
                          "compra_usd"
                        }
                        title={
                          movimiento.tipo ===
                          "compra_usd"
                            ? "Una compra siempre suma dólares"
                            : undefined
                        }
                        onChange={(event) =>
                          actualizarCampo(
                            movimiento.id,
                            "moneda",
                            event.target.value
                          )
                        }
                      >
                        {MONEDAS.map(
                          ({ valor, corta }) => (
                            <option
                              key={valor}
                              value={valor}
                            >
                              {corta}
                            </option>
                          )
                        )}
                      </select>

                    </td>

                    <td data-label="Descripción">

                      <input
                        type="text"
                        value={movimiento.descripcion}
                        placeholder="Ej: Plazo fijo"
                        onChange={(event) =>
                          actualizarCampo(
                            movimiento.id,
                            "descripcion",
                            event.target.value
                          )
                        }
                      />

                    </td>

                    <td data-label="Importe">

                      <CampoImporte
                        aria-label="Importe"
                        value={movimiento.monto}
                        placeholder={
                          movimiento.tipo ===
                          "compra_usd"
                            ? "US$ obtenidos"
                            : "0"
                        }
                        onChange={(valor) =>
                          actualizarCampo(
                            movimiento.id,
                            "monto",
                            valor
                          )
                        }
                      />

                    </td>

                    <td
                      data-label="Pesos pagados"
                      className={
                        movimiento.tipo ===
                        "compra_usd"
                          ? ""
                          : "celda-vacia"
                      }
                    >

                      {movimiento.tipo ===
                      "compra_usd" ? (

                        <CampoImporte
                          aria-label="Pesos pagados"
                          value={movimiento.montoPesos}
                          placeholder="$ pagados"
                          onChange={(valor) =>
                            actualizarCampo(
                              movimiento.id,
                              "montoPesos",
                              valor
                            )
                          }
                        />

                      ) : (

                        <span className="sin-valor">
                          —
                        </span>

                      )}

                    </td>

                    <td data-label="Observaciones">

                      <input
                        type="text"
                        value={movimiento.observaciones}
                        placeholder="Opcional"
                        onChange={(event) =>
                          actualizarCampo(
                            movimiento.id,
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
                          eliminarFila(movimiento)
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

    </main>
  );
};

export default Ahorros;
