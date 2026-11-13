import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, configurarAlVencerSesion, ErrorApi, token } from './cliente';

function respuesta(status: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('T26 — cliente de la API', () => {
  const fetchFalso = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchFalso); token.borrar(); });
  afterEach(() => { vi.unstubAllGlobals(); fetchFalso.mockReset(); });

  it('agrega el token en la cabecera Authorization', async () => {
    token.guardar('abc123');
    fetchFalso.mockResolvedValue(respuesta(200, { ok: true }));
    await api.get('/auth/yo');
    const [url, opciones] = fetchFalso.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/yo$/);
    expect(opciones.headers.Authorization).toBe('Bearer abc123');
  });

  it('manda el cuerpo como JSON', async () => {
    fetchFalso.mockResolvedValue(respuesta(201, { id: 1 }));
    await api.post('/entradas', { actividad: 'Algo' });
    const [, opciones] = fetchFalso.mock.calls[0];
    expect(opciones.method).toBe('POST');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opciones.body)).toEqual({ actividad: 'Algo' });
  });

  it('convierte un error del backend en ErrorApi con su mensaje y detalle (por ejemplo, un 409)', async () => {
    fetchFalso.mockResolvedValue(respuesta(409, { error: 'Otra persona modificó esta entrada', detalle: { version: 3 } }));
    const error = (await api.patch('/entradas/1', {}).catch((e) => e)) as ErrorApi;
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.status).toBe(409);
    expect(error.message).toBe('Otra persona modificó esta entrada');
    expect(error.detalle).toEqual({ version: 3 });
  });

  it('un 401 con sesión iniciada avisa que la sesión venció', async () => {
    const alVencer = vi.fn();
    configurarAlVencerSesion(alVencer);
    token.guardar('vencido');
    fetchFalso.mockResolvedValue(respuesta(401, { error: 'Tu sesión venció' }));
    await api.get('/auth/yo').catch(() => {});
    expect(alVencer).toHaveBeenCalledOnce();
  });

  it('sin conexión devuelve un mensaje claro', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = (await api.get('/salud').catch((e) => e)) as ErrorApi;
    expect(error.status).toBe(0);
    expect(error.message).toContain('No se pudo conectar');
  });
});
