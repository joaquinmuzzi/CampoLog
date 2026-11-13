import { EstadoEntrada } from './tipos';

// RN19 — Transiciones permitidas. VALIDADA es final.
const TRANSICIONES: Record<EstadoEntrada, EstadoEntrada[]> = {
  BORRADOR: ['ENVIADA'],
  ENVIADA: ['VALIDADA', 'OBSERVADA'],
  OBSERVADA: ['ENVIADA'],
  VALIDADA: [],
};

export function puedeTransicionar(desde: EstadoEntrada, hacia: EstadoEntrada): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/** RN20 — El estudiante edita solo borradores y observadas. */
export function puedeEditar(estado: EstadoEntrada): boolean {
  return estado === 'BORRADOR' || estado === 'OBSERVADA';
}

/** RN20 — El estudiante borra solo borradores. */
export function puedeBorrar(estado: EstadoEntrada): boolean {
  return estado === 'BORRADOR';
}

export const NOMBRE_ESTADO: Record<EstadoEntrada, string> = {
  BORRADOR: 'borrador',
  ENVIADA: 'enviada',
  OBSERVADA: 'observada',
  VALIDADA: 'validada',
};
