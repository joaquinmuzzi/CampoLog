// Reemplazo de bcryptjs SOLO para el modo demo en el navegador: las cuentas de la demo viven en memoria,
// en la pestaña, así que alcanza con una marca simple (y la carga inicial es instantánea).
async function hash(password: string, _rondas?: number): Promise<string> {
  return `demo:${password}`;
}

async function compare(password: string, guardado: string): Promise<boolean> {
  return guardado === `demo:${password}`;
}

export default { hash, compare };
