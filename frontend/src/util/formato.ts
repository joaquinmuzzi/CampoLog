import { EstadoEntrada, TipoEvidencia } from '../api/tipos';

export const NOMBRE_ESTADO: Record<EstadoEntrada, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  OBSERVADA: 'Observada',
  VALIDADA: 'Validada',
};

export const NOMBRE_EVIDENCIA: Record<TipoEvidencia, string> = {
  COMMIT: 'Commit',
  DOCUMENTO: 'Documento',
  TAREA: 'Tarea',
  IMAGEN: 'Imagen',
  OTRO: 'Otro',
};

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** AAAA-MM-DD → DD/MM/AAAA */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}

/** AAAA-MM-DD → "mar 15/09" */
export function fechaConDia(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS_CORTOS[dia]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

/** AAAA-MM → "septiembre de 2026" */
export function nombreMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export function mesVecino(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function diasDeSemana(dias: number[]): string {
  return dias.map((d) => DIAS_SEMANA[d - 1]).join(', ');
}

export function horas(valor: number): string {
  return `${String(valor).replace('.', ',')} h`;
}

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Hoy en Argentina como AAAA-MM-DD. */
export function hoyArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
