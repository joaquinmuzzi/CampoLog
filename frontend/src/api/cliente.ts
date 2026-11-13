// Cliente único de la API: agrega el token, traduce errores y avisa cuando la sesión venció.

export const URL_API: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const CLAVE_TOKEN = 'campolog.token';

/** Error que devuelve el backend: mensaje en español, código HTTP y detalle opcional (por ejemplo, en un 409). */
export class ErrorApi extends Error {
  constructor(public readonly status: number, mensaje: string, public readonly detalle?: Record<string, unknown>) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

let alVencerSesion: () => void = () => {};

/** La sesión registra qué hacer cuando el backend responde 401 (cerrar sesión y volver al login). */
export function configurarAlVencerSesion(accion: () => void): void {
  alVencerSesion = accion;
}

export const token = {
  leer: (): string | null => {
    try { return localStorage.getItem(CLAVE_TOKEN); } catch { return null; }
  },
  guardar: (valor: string) => {
    try { localStorage.setItem(CLAVE_TOKEN, valor); } catch { /* sin almacenamiento: la sesión dura la pestaña */ }
  },
  borrar: () => {
    try { localStorage.removeItem(CLAVE_TOKEN); } catch { /* nada */ }
  },
};

async function pedido(metodo: string, ruta: string, cuerpo?: unknown): Promise<Response> {
  const cabeceras: Record<string, string> = {};
  const t = token.leer();
  if (t) cabeceras.Authorization = `Bearer ${t}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${URL_API}/api${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.');
  }

  if (!res.ok) {
    const datos = await res.json().catch(() => ({}));
    if (res.status === 401 && t) alVencerSesion();
    throw new ErrorApi(res.status, datos.error ?? 'Ocurrió un error inesperado', datos.detalle);
  }
  return res;
}

async function json<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const res = await pedido(metodo, ruta, cuerpo);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(ruta: string) => json<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => json<T>('POST', ruta, cuerpo ?? {}),
  patch: <T>(ruta: string, cuerpo: unknown) => json<T>('PATCH', ruta, cuerpo),
  borrar: (ruta: string) => json<void>('DELETE', ruta),
  /** Descarga un archivo (por ejemplo, el CSV de la carpeta) y lo guarda con el nombre que manda el backend. */
  async descargar(ruta: string, nombrePorDefecto: string): Promise<void> {
    const res = await pedido('GET', ruta);
    const disposicion = res.headers.get('Content-Disposition') ?? '';
    const nombre = /filename="([^"]+)"/.exec(disposicion)?.[1] ?? nombrePorDefecto;
    const url = URL.createObjectURL(await res.blob());
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  },
};
