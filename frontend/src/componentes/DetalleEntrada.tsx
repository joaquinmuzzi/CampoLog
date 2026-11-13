import { Comentario, Entrada } from '../api/tipos';
import { fechaConDia, fechaHora, horas, NOMBRE_EVIDENCIA } from '../util/formato';
import { EstadoBadge } from './comunes';

export function Comentarios({ comentarios }: { comentarios: Comentario[] }) {
  if (comentarios.length === 0) return null;
  return (
    <div>
      <div className="etiqueta">Comentarios del docente</div>
      {comentarios.map((c) => (
        <div key={c.id} className={`comentario comentario-${c.tipo.toLowerCase()}`}>
          <div>{c.texto}</div>
          <div className="comentario-autor">
            {c.tipo === 'OBSERVACION' ? 'Observación' : 'Validación'} de {c.autorNombre} · {fechaHora(c.creadoEn)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Vista de solo lectura de una entrada (para el docente y para entradas ya enviadas o validadas). */
export function DetalleEntrada({ entrada }: { entrada: Entrada }) {
  return (
    <div className="formulario">
      <div className="acciones" style={{ alignItems: 'center' }}>
        <strong>{fechaConDia(entrada.fecha)}</strong>
        <EstadoBadge estado={entrada.estado} />
        <span className="subtitulo">{horas(entrada.horas)}</span>
      </div>
      <div>
        <div className="etiqueta">Actividad</div>
        <div>{entrada.actividad}</div>
      </div>
      {entrada.descripcion && (
        <div>
          <div className="etiqueta">Descripción</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{entrada.descripcion}</div>
        </div>
      )}
      {entrada.etiquetas.length > 0 && (
        <div className="acciones">
          {entrada.etiquetas.map((e) => <span key={e} className="badge badge-borrador">#{e}</span>)}
        </div>
      )}
      <div>
        <div className="etiqueta">Evidencias</div>
        {entrada.evidencias.length === 0 ? <p className="subtitulo">Sin evidencias.</p> : (
          <ul>
            {entrada.evidencias.map((ev, i) => (
              <li key={i}>
                {NOMBRE_EVIDENCIA[ev.tipo]}: <a href={ev.url} target="_blank" rel="noopener noreferrer">{ev.titulo}</a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Comentarios comentarios={entrada.comentarios} />
    </div>
  );
}
