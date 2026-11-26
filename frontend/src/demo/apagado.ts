// Fuera del modo demo, '@campolog/demo' apunta acá: así el build normal no incluye el backend en el navegador.
const noDisponible = () => Promise.reject(new Error('El modo demo no está activo en este build'));

export const CUENTAS_DEMO = { estudiante: '', docente: '', admin: '' };
export const atenderDemo = noDisponible;
export const sesionDemo = noDisponible;
