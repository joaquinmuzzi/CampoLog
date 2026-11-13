// RN6 — Bloqueo por intentos: 5 fallidos seguidos bloquean la cuenta 15 minutos.
export const MAX_INTENTOS = 5;
export const MINUTOS_BLOQUEO = 15;

export interface EstadoSeguridad {
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
}

export function estaBloqueado(estado: EstadoSeguridad, ahora: Date): boolean {
  return estado.bloqueadoHasta !== null && estado.bloqueadoHasta.getTime() > ahora.getTime();
}

/** Nuevo estado después de un intento fallido (si un bloqueo anterior ya venció, el contador arranca de cero). */
export function trasIntentoFallido(estado: EstadoSeguridad, ahora: Date): EstadoSeguridad {
  const vencido = estado.bloqueadoHasta !== null && estado.bloqueadoHasta.getTime() <= ahora.getTime();
  const intentos = (vencido ? 0 : estado.intentosFallidos) + 1;
  if (intentos >= MAX_INTENTOS) {
    return { intentosFallidos: intentos, bloqueadoHasta: new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000) };
  }
  return { intentosFallidos: intentos, bloqueadoHasta: null };
}

/** Un inicio de sesión correcto pone el contador en cero. */
export const trasIntentoCorrecto = (): EstadoSeguridad => ({ intentosFallidos: 0, bloqueadoHasta: null });
