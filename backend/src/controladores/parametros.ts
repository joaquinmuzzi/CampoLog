import { noEncontrado } from '../errores';

/** Convierte un parámetro de ruta en un id numérico; si no lo es, el recurso no existe. */
export function idDeRuta(valor: unknown, que = 'Recurso'): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw noEncontrado(que);
  return id;
}
