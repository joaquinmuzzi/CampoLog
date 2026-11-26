// Tipos del módulo del modo demo (src/demo/servidor.ts). Ese código importa el backend (backend/src), que se
// compila con su propio tsconfig, por eso src/demo queda fuera del chequeo de tipos del frontend.
declare module '@campolog/demo' {
  export const CUENTAS_DEMO: { estudiante: string; docente: string; admin: string };
  export function atenderDemo(metodo: string, ruta: string, cabeceras: Record<string, string>, cuerpo?: unknown): Promise<Response>;
  export function sesionDemo(email: string): Promise<import('./api/tipos').Sesion>;
}
