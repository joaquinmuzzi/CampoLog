import { Link } from 'react-router-dom';
import { api } from '../../api/cliente';
import { Resumen } from '../../api/tipos';
import { Aviso, Cargando, Dato, Tarjeta, Vacio } from '../../componentes/comunes';
import { useSesion } from '../../sesion/Sesion';
import { diasDeSemana, fechaConDia, fechaCorta, horas } from '../../util/formato';
import { useDatos } from '../../util/useDatos';

export function TarjetaResumen({ r }: { r: Resumen }) {
  return (
    <Tarjeta titulo="Mi situación">
      <div className="grilla-datos">
        <Dato etiqueta={`Asistencia (${r.diasValidados} de ${r.diasTranscurridos} días validados)`} valor={`${r.asistencia} %`} destacado={r.enRiesgo ? 'mal' : 'bien'} />
        <Dato etiqueta={`Horas validadas de ${horas(r.horasCalendario)}`} valor={horas(r.horasValidadas)} />
        <Dato etiqueta="Enviadas esperando revisión" valor={r.enviadasPorRevisar} />
        <Dato etiqueta="Observadas para corregir" valor={r.cantidadPorEstado.OBSERVADA} destacado={r.cantidadPorEstado.OBSERVADA ? 'mal' : undefined} />
      </div>
    </Tarjeta>
  );
}

/** HU7 y HU12 — Inicio del estudiante: situación, alerta de riesgo y días pendientes de carga (RN25, RN26, RN27). */
export function InicioEstudiante() {
  const { usuario } = useSesion();
  const { datos: r, error, cargando } = useDatos(() => api.get<Resumen>('/mi/resumen'), []);

  if (cargando) return <Cargando />;
  if (error || !r) return <Aviso>{error}</Aviso>;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Hola, {usuario?.nombre}</h1>
          <p className="subtitulo">{r.comision.nombre} · {diasDeSemana(r.comision.diasSemana)} · {r.comision.horasJornada} h por jornada · del {fechaCorta(r.comision.fechaInicio)} al {fechaCorta(r.comision.fechaFin)}</p>
        </div>
        <Link className="boton" to="/estudiante/entradas/nueva">Cargar jornada</Link>
      </div>

      {r.enRiesgo && (
        <Aviso tipo="alerta">
          <strong>Tu asistencia está por debajo del 75 %.</strong> Cargá y enviá tus jornadas a tiempo y corregí las observadas para no quedar en riesgo.
        </Aviso>
      )}

      <TarjetaResumen r={r} />

      <Tarjeta titulo="Pendientes de carga">
        {r.pendientes.length === 0 ? (
          <Vacio>No tenés jornadas pendientes. ¡Vas al día!</Vacio>
        ) : (
          <>
            <p className="subtitulo">Cada jornada se carga hasta 7 días después. Pasado ese plazo queda sin registro.</p>
            <ul className="lista">
              {r.pendientes.map((p) => (
                <li key={p.fecha} className="item">
                  <div>
                    <div className="item-titulo">{fechaConDia(p.fecha)}</div>
                    <div className="item-detalle">{p.diasRestantes === 0 ? 'Vence hoy' : `Quedan ${p.diasRestantes} ${p.diasRestantes === 1 ? 'día' : 'días'}`}</div>
                  </div>
                  <Link className="boton boton-chico" to={`/estudiante/entradas/nueva?fecha=${p.fecha}`}>Cargar</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Tarjeta>
    </>
  );
}
