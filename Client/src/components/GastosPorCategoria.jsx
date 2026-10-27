import "../styles/graficos.css";

const formatearPorcentaje = (parte, total) => {
  if (total <= 0) return "0%";

  const valor = (parte / total) * 100;

  return valor > 0 && valor < 1
    ? "<1%"
    : `${Math.round(valor)}%`;
};

// Una barra por categoría, de mayor a menor gasto. Se listan todas
// las categorías con gastos en el mes, sin agrupar ninguna.
const GastosPorCategoria = ({
  categorias,
  totalGeneral,
  mesAnterior,
  nombreMesAnterior,
  periodo,
  formatearDinero,
}) => {
  const filas = [...(categorias || [])]
    .filter((categoria) => categoria.total > 0)
    .sort((a, b) => b.total - a.total);

  const suma = filas.reduce(
    (acumulado, categoria) =>
      acumulado + categoria.total,
    0
  );

  const maximo = filas.length
    ? filas[0].total
    : 0;

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


      {filas.length === 0 ? (

        <p className="sin-datos">
          Todavía no hay gastos cargados este mes.
        </p>

      ) : (

        <ul
          className="lista-categorias"
          aria-label="Gastos por categoría"
        >

          {filas.map((categoria) => {
            const sinCategoria =
              categoria.id === null;

            return (

              <li
                key={
                  sinCategoria
                    ? "sin-categoria"
                    : categoria.id
                }
                title={`${
                  categoria.nombre
                }: ${formatearDinero(
                  categoria.total
                )} (${formatearPorcentaje(
                  categoria.total,
                  suma
                )})`}
              >

                <div className="categoria-texto">

                  <span className="categoria-nombre">
                    {categoria.nombre}
                  </span>

                  <span className="categoria-monto">
                    {formatearDinero(
                      categoria.total
                    )}
                  </span>

                  <span className="categoria-porcentaje">
                    {formatearPorcentaje(
                      categoria.total,
                      suma
                    )}
                  </span>

                </div>

                <span
                  className="categoria-pista"
                  aria-hidden="true"
                >

                  <span
                    className={`categoria-barra ${
                      sinCategoria
                        ? "barra-sin-categoria"
                        : ""
                    }`}
                    style={{
                      width: `${Math.max(
                        (categoria.total /
                          maximo) *
                          100,
                        1.5
                      )}%`,
                    }}
                  />

                </span>

              </li>

            );
          })}

        </ul>

      )}

    </section>
  );
};

export default GastosPorCategoria;
