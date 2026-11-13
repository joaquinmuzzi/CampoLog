// RN7 — Código de inscripción: 6 caracteres de un alfabeto sin caracteres confusos (sin 0, O, 1 ni I).
export const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LARGO_CODIGO = 6;

export function generarCodigo(aleatorio: () => number = Math.random): string {
  let codigo = '';
  for (let i = 0; i < LARGO_CODIGO; i++) codigo += ALFABETO_CODIGO[Math.floor(aleatorio() * ALFABETO_CODIGO.length)];
  return codigo;
}

export function esCodigoValido(codigo: string): boolean {
  return new RegExp(`^[${ALFABETO_CODIGO}]{${LARGO_CODIGO}}$`).test(codigo);
}
