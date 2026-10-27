import { useRef, useState } from "react";

import {
  crearOrigen,
  guardarCambiosGastos,
} from "../services/api";

import { obtenerFechaSugerida } from "../utils/fechas";

const CLAVE_ULTIMO_ORIGEN = "gastoRapido.ultimoOrigen";

const leerUltimoOrigen = () => {
  try {
    return Number(
      localStorage.getItem(CLAVE_ULTIMO_ORIGEN)
    );
  } catch {
    return null;
  }
};

const guardarUltimoOrigen = (id) => {
  try {
    localStorage.setItem(
      CLAVE_ULTIMO_ORIGEN,
      String(id)
    );
  } catch {
    // sin almacenamiento disponible: no pasa nada
  }
};

// Carga un gasto en pocos segundos, sin categoría (se clasifica
// después desde Movimientos).
const GastoRapido = ({
  origenes,
  anio,
  mes,
  onGuardado,
  onCerrar,
}) => {
  const campoMonto = useRef(null);

  const origenInicial = () => {
    const ultimo = leerUltimoOrigen();

    if (
      origenes.some(
        (origen) => origen.id === ultimo
      )
    ) {
      return ultimo;
    }

    return origenes[0]?.id ?? "";
  };

  const [monto, setMonto] = useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [origenId, setOrigenId] =
    useState(origenInicial);

  const [nombreNuevoOrigen, setNombreNuevoOrigen] =
    useState("");

  const [fecha, setFecha] = useState(() =>
    obtenerFechaSugerida(anio, mes)
  );

  const [error, setError] = useState("");

  const [guardando, setGuardando] =
    useState(false);

  const sinOrigenes = origenes.length === 0;

  const cerrar = () => {
    if (!guardando) onCerrar();
  };

  const guardar = async (seguirCargando) => {
    setError("");

    const importe = Number(
      String(monto).replace(",", ".")
    );

    const texto = descripcion.trim();

    if (!Number.isFinite(importe) || importe <= 0) {
      setError("Ingresá un importe mayor a cero.");

      return;
    }

    if (!texto) {
      setError("Ingresá una descripción.");

      return;
    }

    if (texto.length > 255) {
      setError(
        "La descripción no puede superar los 255 caracteres."
      );

      return;
    }

    if (!fecha) {
      setError("Elegí una fecha.");

      return;
    }

    if (sinOrigenes && !nombreNuevoOrigen.trim()) {
      setError(
        "Escribí un nombre para el origen (por ejemplo, Efectivo)."
      );

      return;
    }

    try {
      setGuardando(true);

      let idDestino = Number(origenId);

      let nombreDestino = origenes.find(
        (origen) => origen.id === idDestino
      )?.nombre;

      if (sinOrigenes) {
        const creado = await crearOrigen(
          nombreNuevoOrigen.trim()
        );

        idDestino = creado.id;

        nombreDestino = creado.nombre;
      }

      await guardarCambiosGastos(idDestino, {
        crear: [
          {
            fecha,
            descripcion: texto,
            monto: importe,
            categoriaId: null,
            cuotaActual: "",
            cuotasTotales: "",
            observaciones: "",
          },
        ],
      });

      guardarUltimoOrigen(idDestino);

      onGuardado({
        mensaje: `Gasto guardado en ${nombreDestino} (sin categoría).`,
        cerrar: !seguirCargando,
      });

      if (seguirCargando) {
        setMonto("");
        setDescripcion("");
        setNombreNuevoOrigen("");

        if (sinOrigenes) {
          setOrigenId(idDestino);
        }

        campoMonto.current?.focus();
      }
    } catch (error) {
      setError(
        error.message ||
          "No se pudo guardar el gasto"
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay">

      <div className="modal">

        <div className="modal-header">

          <div>

            <span className="modal-label">
              GASTO RÁPIDO
            </span>

            <h2>
              Cargar un gasto
            </h2>

          </div>

          <button
            type="button"
            className="modal-cerrar"
            onClick={cerrar}
            aria-label="Cerrar"
          >
            ×
          </button>

        </div>


        <p className="modal-ayuda">
          Se guarda sin categoría. Podés
          clasificarlo después desde Movimientos.
        </p>


        <form
          className="gasto-rapido-form"
          onSubmit={(event) => {
            event.preventDefault();
            guardar(false);
          }}
        >

          <div>

            <label
              htmlFor="gastoRapidoMonto"
              className="campo-label"
            >
              Importe
            </label>

            <input
              id="gastoRapidoMonto"
              ref={campoMonto}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="campo-input campo-importe"
              placeholder="0"
              value={monto}
              autoFocus
              onChange={(event) =>
                setMonto(event.target.value)
              }
            />

          </div>


          <div>

            <label
              htmlFor="gastoRapidoDescripcion"
              className="campo-label"
            >
              Descripción
            </label>

            <input
              id="gastoRapidoDescripcion"
              type="text"
              className="campo-input"
              placeholder="Ej: Café, nafta, kiosco"
              maxLength={255}
              value={descripcion}
              onChange={(event) =>
                setDescripcion(event.target.value)
              }
            />

          </div>


          <div className="fila-selectores">

            <div>

              <label
                htmlFor="gastoRapidoOrigen"
                className="campo-label"
              >
                Origen
              </label>

              {sinOrigenes ? (

                <input
                  id="gastoRapidoOrigen"
                  type="text"
                  className="campo-input"
                  placeholder="Ej: Efectivo"
                  maxLength={100}
                  value={nombreNuevoOrigen}
                  onChange={(event) =>
                    setNombreNuevoOrigen(
                      event.target.value
                    )
                  }
                />

              ) : (

                <select
                  id="gastoRapidoOrigen"
                  className="campo-input"
                  value={origenId}
                  onChange={(event) =>
                    setOrigenId(
                      Number(event.target.value)
                    )
                  }
                >
                  {origenes.map((origen) => (
                    <option
                      key={origen.id}
                      value={origen.id}
                    >
                      {origen.nombre}
                    </option>
                  ))}
                </select>

              )}

            </div>

            <div>

              <label
                htmlFor="gastoRapidoFecha"
                className="campo-label"
              >
                Fecha
              </label>

              <input
                id="gastoRapidoFecha"
                type="date"
                className="campo-input"
                value={fecha}
                onChange={(event) =>
                  setFecha(event.target.value)
                }
              />

            </div>

          </div>

          {sinOrigenes && (
            <p className="modal-ayuda gasto-rapido-nota">
              Todavía no tenés orígenes: se va a
              crear uno con ese nombre.
            </p>
          )}


          {error && (
            <p className="modal-error">
              {error}
            </p>
          )}


          <div className="modal-acciones gasto-rapido-acciones">

            <button
              type="button"
              className="boton-cancelar"
              onClick={() => guardar(true)}
              disabled={guardando}
            >
              Guardar y cargar otro
            </button>

            <button
              type="submit"
              className="boton-guardar"
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : "Guardar"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
};

export default GastoRapido;
