import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { manejarErrores } from '../src/middlewares/errores';
import { autenticar, requerirRol } from '../src/middlewares/autenticacion';
import { crearContexto } from './ayudas/contexto';

function appProtegida(ctx: ReturnType<typeof crearContexto>) {
  const app = express();
  app.get('/solo-admin', autenticar(ctx.servicios.auth), requerirRol('ADMIN'), (_req, res) => { res.json({ ok: true }); });
  app.use(manejarErrores);
  return app;
}

describe('T08 — autenticación y roles', () => {
  it('sin token responde 401', async () => {
    const ctx = crearContexto();
    const res = await request(appProtegida(ctx)).get('/solo-admin');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Tenés que iniciar sesión');
  });

  it('con un token inválido o vencido responde 401 (RN5)', async () => {
    const ctx = crearContexto();
    const admin = await ctx.crearUsuario('ADMIN', 'admin@x.com');
    const token = ctx.tokenDe(admin);
    ctx.reloj.avanzarMinutos(8 * 60 + 1);
    expect((await request(appProtegida(ctx)).get('/solo-admin').set('Authorization', token)).status).toBe(401);
    expect((await request(appProtegida(ctx)).get('/solo-admin').set('Authorization', 'Bearer basura')).status).toBe(401);
  });

  it('con un rol no permitido responde 403', async () => {
    const ctx = crearContexto();
    const docente = await ctx.crearUsuario('DOCENTE', 'doc@x.com');
    const res = await request(appProtegida(ctx)).get('/solo-admin').set('Authorization', ctx.tokenDe(docente));
    expect(res.status).toBe(403);
  });

  it('con el rol correcto deja pasar', async () => {
    const ctx = crearContexto();
    const admin = await ctx.crearUsuario('ADMIN', 'admin@x.com');
    const res = await request(appProtegida(ctx)).get('/solo-admin').set('Authorization', ctx.tokenDe(admin));
    expect(res.status).toBe(200);
  });

  it('GET /api/auth/yo devuelve el usuario de la sesión sin datos sensibles', async () => {
    const ctx = crearContexto();
    const docente = await ctx.crearUsuario('DOCENTE', 'doc@x.com', { nombre: 'Diego', apellido: 'Morales' });
    const res = await request(ctx.app).get('/api/auth/yo').set('Authorization', ctx.tokenDe(docente));
    expect(res.status).toBe(200);
    expect(res.body.usuario).toEqual({ id: docente.id, nombre: 'Diego', apellido: 'Morales', email: 'doc@x.com', rol: 'DOCENTE', comisionId: null });
    expect(res.body.comision).toBeNull();
  });
});
