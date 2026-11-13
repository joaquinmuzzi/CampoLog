import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';
import { leerConfigDelEntorno, origenesPermitidos } from '../src/config';
import { leerEntornoDelServidor } from '../src/arranque';
import { crearContexto } from './ayudas/contexto';

const FRONT = 'https://campolog-front.up.railway.app';

function appCon(frontendUrl?: string) {
  const { deps } = crearContexto();
  return crearApp({ ...deps, config: { ...deps.config, frontendUrl } });
}

describe('T32 — CORS con FRONTEND_URL', () => {
  it('el origen del frontend publicado puede llamar a la API (preflight con Authorization)', async () => {
    const res = await request(appCon(FRONT))
      .options('/api/auth/login')
      .set('Origin', FRONT)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(FRONT);
    expect(res.headers['access-control-allow-headers']).toMatch(/authorization/i);
  });

  it('un origen que no es el frontend no recibe permiso de CORS', async () => {
    const res = await request(appCon(FRONT)).get('/api/salud').set('Origin', 'https://sitio-ajeno.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sin FRONTEND_URL no se habilita ningún origen externo', async () => {
    const res = await request(appCon(undefined)).get('/api/salud').set('Origin', FRONT);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('acepta varios orígenes separados por coma y tolera la barra final', () => {
    expect(origenesPermitidos(' https://a.app/ , http://localhost:5173 ')).toEqual(['https://a.app', 'http://localhost:5173']);
    expect(origenesPermitidos(undefined)).toEqual([]);
  });
});

describe('T32 — variables de entorno', () => {
  it('JWT_SECRET es obligatorio y tiene que ser largo', () => {
    expect(() => leerConfigDelEntorno({})).toThrow(/JWT_SECRET/);
    expect(() => leerConfigDelEntorno({ JWT_SECRET: 'corto' })).toThrow(/JWT_SECRET/);
    expect(leerConfigDelEntorno({ JWT_SECRET: 'x'.repeat(32), FRONTEND_URL: FRONT }).frontendUrl).toBe(FRONT);
  });

  it('el servidor exige DATABASE_URL y lee el resto con valores por defecto', () => {
    expect(() => leerEntornoDelServidor({})).toThrow(/DATABASE_URL/);
    const env = leerEntornoDelServidor({ DATABASE_URL: 'postgres://u:p@h:5432/db' });
    expect(env).toMatchObject({ puerto: 3000, sembrarDemo: false, ssl: false, adminInicial: null });
    const completo = leerEntornoDelServidor({
      DATABASE_URL: 'postgres://u:p@h:5432/db', PORT: '8080', SEMBRAR_DEMO: 'true', DATABASE_SSL: 'true',
      INITIAL_ADMIN_EMAIL: 'admin@escuela.edu.ar', INITIAL_ADMIN_PASSWORD: 'una-clave-123',
    });
    expect(completo).toMatchObject({ puerto: 8080, sembrarDemo: true, ssl: true, adminInicial: { email: 'admin@escuela.edu.ar' } });
  });
});
