// Fechas del negocio como texto AAAA-MM-DD (sin hora). Ver plan.md, DT5.
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

function aUtc(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

function desdeUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function esFechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== 'string' || !FORMATO_FECHA.test(fecha)) return false;
  return desdeUtc(aUtc(fecha)) === fecha;
}

export function esMesValido(mes: unknown): mes is string {
  return typeof mes === 'string' && FORMATO_MES.test(mes);
}

export function sumarDias(fecha: string, dias: number): string {
  return desdeUtc(aUtc(fecha) + dias * MS_POR_DIA);
}

/** Días desde `desde` hasta `hasta` (positivo si `hasta` es posterior). */
export function diferenciaEnDias(desde: string, hasta: string): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / MS_POR_DIA);
}

/** 1 = lunes ... 7 = domingo. */
export function diaDeSemana(fecha: string): number {
  const d = new Date(aUtc(fecha)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

export function diasDelMes(mes: string): string[] {
  const [a, m] = mes.split('-').map(Number);
  const cantidad = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: cantidad }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
}
