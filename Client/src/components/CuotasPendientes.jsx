import "../styles/graficos.css";

const MESES_VISIBLES = 6;

const CuotasPendientes = ({
  cuotas,
  periodo,
  nombresMeses,
  formatearDinero,
}) => {
  if (!cuotas) {
    return (
      <section className="grafico-card">

        <div className="grafico-encabezado">

          <div>

            <h3>
              Cuotas pendientes
            </h3>

            <p className="grafico-subtitulo">
              No tenés cuotas por pagar después de{" "}
              {periodo}.
            </p>

          </div>

        </div>

      </section>
    );
  }

  const visibles = cuotas.porMes.slice(
    0,
    MESES_VISIBLES
  );

  const maximo = Math.max(
    ...visibles.map((mes) => mes.total)
  );

  const mesesTotales =
    cuotas.ultimoMes.anio * 12 +
    cuotas.ultimoMes.mes -
    (cuotas.porMes[0].anio * 12 +
      cuotas.porMes[0].mes) +
    1;

  const mesesOcultos = Math.max(
    mesesTotales - visibles.length,
    0
  );

  const nombreUltimo = `${
    nombresMeses[cuotas.ultimoMes.mes - 1]
  } ${cuotas.ultimoMes.anio}`;

  return (
    <section className="grafico-card">

      <div className="grafico-encabezado">

        <div>

          <h3>
            Cuotas pendientes
          </h3>

          <p className="grafico-subtitulo">
            Lo que ya tenés comprometido después
            de {periodo}
          </p>

        </div>

      </div>


      <div className="cuotas-resumen">

        <strong className="cuotas-total">
          {formatearDinero(cuotas.total)}
        </strong>

        <p>
          en {cuotas.cantidadCuotas} cuota
          {cuotas.cantidadCuotas === 1 ? "" : "s"}{" "}
          de {cuotas.cantidadCompras} compra
          {cuotas.cantidadCompras === 1 ? "" : "s"}.
          La última vence en{" "}
          <b>{nombreUltimo}</b>.
        </p>

      </div>


      <ul
        className="cuotas-meses"
        aria-label="Cuotas por mes"
      >

        {visibles.map((mes) => (

          <li
            key={`${mes.anio}-${mes.mes}`}
            title={`${
              nombresMeses[mes.mes - 1]
            } ${mes.anio}: ${formatearDinero(
              mes.total
            )}`}
          >

            <span className="cuotas-mes-nombre">
              {nombresMeses[mes.mes - 1].slice(0, 3)}{" "}
              {String(mes.anio).slice(2)}
            </span>

            <span className="cuotas-barra-pista">

              <span
                className="cuotas-barra"
                style={{
                  width: `${Math.max(
                    (mes.total / maximo) * 100,
                    2
                  )}%`,
                }}
              />

            </span>

            <span className="cuotas-mes-monto">
              {formatearDinero(mes.total)}
            </span>

          </li>

        ))}

      </ul>

      {mesesOcultos > 0 && (

        <p className="cuotas-nota">
          y {mesesOcultos} mes
          {mesesOcultos === 1 ? "" : "es"} más hasta{" "}
          {nombreUltimo}
        </p>

      )}

    </section>
  );
};

export default CuotasPendientes;
