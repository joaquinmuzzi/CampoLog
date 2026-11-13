import { diferenciaEnDias } from './fechas';

/** RN14 y RN21 — Días corridos para cargar y enviar una jornada, y para corregir una observada. */
export const PLAZO_DIAS = 7;

/** RN13 — No se registran fechas posteriores a hoy. */
export function esFutura(fecha: string, hoy: string): boolean {
  return fecha > hoy;
}

/** RN14 — Se puede crear (y enviar por primera vez) hasta 7 días corridos después de la fecha. */
export function dentroDePlazoDeCarga(fecha: string, hoy: string): boolean {
  const transcurridos = diferenciaEnDias(fecha, hoy);
  return transcurridos >= 0 && transcurridos <= PLAZO_DIAS;
}

/** RN25 — Días de plazo que le quedan a un día transcurrido (0 = vence hoy). */
export function diasRestantesDeCarga(fecha: string, hoy: string): number {
  return PLAZO_DIAS - diferenciaEnDias(fecha, hoy);
}

/** RN21 — Una observada se reenvía como máximo 7 días corridos después de la observación. */
export function dentroDePlazoDeCorreccion(fechaObservacion: string, hoy: string): boolean {
  return diferenciaEnDias(fechaObservacion, hoy) <= PLAZO_DIAS;
}
