import { useRef, useState } from "react";

import "../styles/graficos.css";

const MAX_SLOTS = 8;

// Arma las entradas del gráfico. El color sigue a la categoría (según su
// posición entre las categorías activas, ordenadas por id), no a su monto:
// así una categoría conserva su color al cambiar de mes.
const armarEntradas = (categorias, idsCategorias) => {
  const entradas = [];

  let otras = null;

  for (const categoria of categorias) {
    if (categoria.id === null) {
      entradas.push({
        clave: "sin-categoria",
        nombre: "Sin categoría",
        total: categoria.total,
        color: "var(--gris-sin)",
        orden: 100,
      });

      continue;
    }

    const slot = idsCategorias.indexOf(categoria.id);

    if (slot === -1 || slot >= MAX_SLOTS) {
      otras = {
        clave: "otras",
        nombre: "Otras categorías",
        total: (otras?.total || 0) + categoria.total,
        color: "var(--gris-otras)",
        orden: 101,
      };

      continue;
    }

    entradas.push({
      clave: `cat-${categoria.id}`,
      nombre: categoria.nombre,
      total: categoria.total,
      color: `var(--serie-${slot + 1})`,
      orden: slot,
    });
  }

  if (otras) {
    entradas.push(otras);
  }

  return entradas;
};

const formatearPorcentaje = (parte, total) => {
  if (total <= 0) return "0%";

  const valor = (parte / total) * 100;

  return valor > 0 && valor < 1
    ? "<1%"
    : `${Math.round(valor)}%`;
};

const GastosPorCategoria = ({
  categorias,
  idsCategorias,
  totalGeneral,
  mesAnterior,
  nombreMesAnterior,
  periodo,
  formatearDinero,
}) => {
  const contenedor = useRef(null);

  const [activa, setActiva] = useState(null);

  const [tooltip, setTooltip] = useState(null);

  const entradas = armarEntradas(
    categorias || [],
    idsCategorias || []
  );

  const suma = entradas.reduce(
    (acumulado, entrada) =>
      acumulado + entrada.total,
    0
  );

  // Barra: orden fijo por color (garantiza vecinos bien distinguibles).
  // Lista: de mayor a menor gasto.
  const entradasBarra = [...entradas].sort(
    (a, b) => a.orden - b.orden
  );

  const entradasLista = [...entradas].sort(
    (a, b) => b.total - a.total
  );

  // ---------- comparación con el mes anterior ----------

  let comparacion = null;

  if (mesAnterior && mesAnterior.total > 0) {
    const variacion =
      ((totalGeneral - mesAnterior.total) /
        mesAnterior.total) *
      100;

    const redondeada = Math.round(
      Math.abs(variacion)
    );

    if (redondeada === 0) {
      comparacion = {
        tipo: "igual",
        texto: `Igual que ${nombreMesAnterior}`,
      };
    } else if (variacion > 0) {
      comparacion = {
        tipo: "sube",
        texto: `${redondeada}% más que ${nombreMesAnterior}`,
      };
    } else {
      comparacion = {
        tipo: "baja",
        texto: `${redondeada}% menos que ${nombreMesAnterior}`,
      };
    }
  }

  // ---------- tooltip ----------

  const mostrarTooltip = (elemento, entrada, evento) => {
    const cajaContenedor =
      contenedor.current.getBoundingClientRect();

    const cajaElemento =
      elemento.getBoundingClientRect();

    setActiva(entrada.clave);

    setTooltip({
      entrada,

      x: evento
        ? evento.clientX - cajaContenedor.left
        : cajaElemento.left +
          cajaElemento.width / 2 -
          cajaContenedor.left,

      ancho: cajaContenedor.width,
    });
  };

  const ocultarTooltip = () => {
    setActiva(null);
    setTooltip(null);
  };

  // ---------- render ----------

  return (
    <section className="grafico-card">

      <div className="grafico-encabezado">

        <div>

          <h3>
            ¿En qué se va la plata?
          </h3>

          <p className="grafico-subtitulo">
            Gastos de {periodo} por categoría
          </p>

        </div>

        {comparacion && (

          <p
            className={`grafico-comparacion comparacion-${comparacion.tipo}`}
          >

            <span aria-hidden="true">
              {comparacion.tipo === "sube"
                ? "▲"
                : comparacion.tipo === "baja"
                  ? "▼"
                  : "＝"}
            </span>

            {comparacion.texto}

            <small>
              {formatearDinero(
                mesAnterior.total
              )}
            </small>

          </p>

        )}

      </div>


      {entradas.length === 0 || suma <= 0 ? (

        <p className="sin-datos">
          Todavía no hay gastos cargados este mes.
        </p>

      ) : (

        <>

          <div
            className="barra-apilada"
            ref={contenedor}
            role="group"
            aria-label="Gastos por categoría"
          >

            {entradasBarra.map((entrada) => (

              <button
                key={entrada.clave}
                type="button"
                className={`segmento ${
                  activa && activa !== entrada.clave
                    ? "segmento-atenuado"
                    : ""
                }`}
                style={{
                  flexGrow: entrada.total,
                  "--color": entrada.color,
                }}
                aria-label={`${entrada.nombre}: ${formatearDinero(
                  entrada.total
                )} (${formatearPorcentaje(
                  entrada.total,
                  suma
                )})`}
                onPointerMove={(evento) =>
                  mostrarTooltip(
                    evento.currentTarget,
                    entrada,
                    evento
                  )
                }
                onPointerLeave={ocultarTooltip}
                onFocus={(evento) =>
                  mostrarTooltip(
                    evento.currentTarget,
                    entrada
                  )
                }
                onBlur={ocultarTooltip}
              >

                <span className="segmento-marca" />

              </button>

            ))}

            {tooltip && (

              <div
                className="grafico-tooltip"
                style={{
                  left: Math.min(
                    Math.max(tooltip.x, 80),
                    tooltip.ancho - 80
                  ),
                }}
                role="status"
              >

                <strong>
                  {formatearDinero(
                    tooltip.entrada.total
                  )}
                </strong>

                <span>

                  <i
                    className="clave-linea"
                    style={{
                      "--color": tooltip.entrada.color,
                    }}
                  />

                  {tooltip.entrada.nombre} ·{" "}
                  {formatearPorcentaje(
                    tooltip.entrada.total,
                    suma
                  )}

                </span>

              </div>

            )}

          </div>


          <ul className="lista-categorias">

            {entradasLista.map((entrada) => (

              <li
                key={entrada.clave}
                className={
                  activa && activa !== entrada.clave
                    ? "fila-atenuada"
                    : ""
                }
                onPointerEnter={() =>
                  setActiva(entrada.clave)
                }
                onPointerLeave={() =>
                  setActiva(null)
                }
              >

                <i
                  className="clave-cuadro"
                  style={{
                    "--color": entrada.color,
                  }}
                />

                <span
                  className="categoria-nombre"
                  title={entrada.nombre}
                >
                  {entrada.nombre}
                </span>

                <span className="categoria-monto">
                  {formatearDinero(entrada.total)}
                </span>

                <span className="categoria-porcentaje">
                  {formatearPorcentaje(
                    entrada.total,
                    suma
                  )}
                </span>

              </li>

            ))}

          </ul>

        </>

      )}

    </section>
  );
};

export default GastosPorCategoria;
