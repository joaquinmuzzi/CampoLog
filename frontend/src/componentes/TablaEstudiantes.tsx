import { Link } from 'react-router-dom';
import { Resumen } from '../api/tipos';
import { horas } from '../util/formato';
import { Vacio } from './comunes';

/** HU13 — Estudiantes de una comisión con su situación; primero los que están en riesgo (RN26, RN27). */
export function TablaEstudiantes({ estudiantes, enlace }: { estudiantes: Resumen[]; enlace?: (id: number) => string }) {
  if (estudiantes.length === 0) return <Vacio>Todavía no hay estudiantes inscriptos. Compartí el código de inscripción.</Vacio>;
  return (
    <div className="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Asistencia</th>
            <th>Horas validadas</th>
            <th>Por revisar</th>
            <th>Observadas</th>
            {enlace && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {estudiantes.map((r) => (
            <tr key={r.estudiante.id}>
              <td>
                {r.estudiante.apellido}, {r.estudiante.nombre}
                {r.enRiesgo && <> <span className="badge badge-riesgo">En riesgo</span></>}
              </td>
              <td>{r.asistencia} % <small className="subtitulo">({r.diasValidados}/{r.diasTranscurridos})</small></td>
              <td>{horas(r.horasValidadas)}</td>
              <td>{r.enviadasPorRevisar > 0 && enlace
                ? <Link to={`${enlace(r.estudiante.id)}?estado=ENVIADA`}><strong>{r.enviadasPorRevisar}</strong></Link>
                : r.enviadasPorRevisar}</td>
              <td>{r.cantidadPorEstado.OBSERVADA}</td>
              {enlace && <td><Link className="boton boton-secundario boton-chico" to={enlace(r.estudiante.id)}>Ver carpeta</Link></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
