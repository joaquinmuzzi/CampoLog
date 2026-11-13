import { DiaDelCalendario } from '../api/tipos';
import { NOMBRE_ESTADO } from '../util/formato';

const CABECERA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function textoDelDia(d: DiaDelCalendario): string {
  switch (d.tipo) {
    case 'CON_ENTRADA': return NOMBRE_ESTADO[d.estado!];
    case 'PENDIENTE': return d.diasRestantes === 0 ? 'Cargar hoy' : `Cargar (${d.diasRestantes} d)`;
    case 'SIN_REGISTRO': return 'Sin registro';
    case 'NO_LABORABLE': return d.motivo ?? 'No laborable';
    case 'FUTURO': return 'Práctica';
    default: return '';
  }
}

/** Lunes = 0 ... domingo = 6 */
function columna(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

/** HU7 — Calendario del mes con el estado de cada día (RN8, RN14, RN25). */
export function CalendarioMes({ dias, hoy, alElegir }: { dias: DiaDelCalendario[]; hoy: string; alElegir?: (d: DiaDelCalendario) => void }) {
  if (dias.length === 0) return null;
  const huecos = columna(dias[0].fecha);
  return (
    <>
      <div className="calendario" role="grid" aria-label="Calendario del mes">
        {CABECERA.map((c) => <div key={c} className="calendario-dia-semana">{c}</div>)}
        {Array.from({ length: huecos }, (_, i) => <div key={`hueco-${i}`} />)}
        {dias.map((d) => {
          const clickeable = d.tipo === 'PENDIENTE' || d.tipo === 'CON_ENTRADA';
          const clases = ['dia', `dia-${d.tipo.toLowerCase()}`, d.estado ? `estado-${d.estado.toLowerCase()}` : '', d.fecha === hoy ? 'dia-hoy' : '']
            .filter(Boolean).join(' ');
          const contenido = (
            <>
              <span className="dia-numero">{Number(d.fecha.slice(8))}</span>
              <span className="dia-texto">{textoDelDia(d)}</span>
            </>
          );
          return clickeable && alElegir ? (
            <button key={d.fecha} type="button" className={clases} onClick={() => alElegir(d)} title={textoDelDia(d)} data-fecha={d.fecha}>
              {contenido}
            </button>
          ) : (
            <div key={d.fecha} className={clases} title={textoDelDia(d)} data-fecha={d.fecha}>{contenido}</div>
          );
        })}
      </div>
      <div className="leyenda">
        <span className="leyenda-pendiente">Pendiente de carga</span>
        <span style={{ ['--c' as string]: 'var(--rojo-claro)' }}>Sin registro</span>
        <span style={{ ['--c' as string]: 'var(--azul-claro)' }}>Enviada</span>
        <span style={{ ['--c' as string]: 'var(--ambar-claro)' }}>Observada</span>
        <span style={{ ['--c' as string]: 'var(--verde-claro)' }}>Validada</span>
        <span style={{ ['--c' as string]: 'var(--gris-claro)' }}>Feriado o receso</span>
        <span style={{ ['--c' as string]: '#fff' }}>Práctica futura / borrador</span>
      </div>
    </>
  );
}
