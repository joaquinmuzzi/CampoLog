import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { esquemaPassword } from '../src/dominio/validaciones';
import { crearContexto, PASSWORD } from './ayudas/contexto';

describe('T06 — RN2: contraseña', () => {
  it('acepta 8 caracteres con letra y número', () => {
    expect(esquemaPassword.safeParse('clave123').success).toBe(true);
  });
  it('rechaza menos de 8 caracteres', () => {
    expect(esquemaPassword.safeParse('clave12').error?.issues[0].message).toBe('La contraseña tiene que tener al menos 8 caracteres');
  });
  it('rechaza "abcdefgh" porque le falta un número', () => {
    expect(esquemaPassword.safeParse('abcdefgh').error?.issues[0].message).toBe('La contraseña tiene que tener al menos un número');
  });
  it('rechaza "12345678" porque le falta una letra', () => {
    expect(esquemaPassword.safeParse('12345678').error?.issues[0].message).toBe('La contraseña tiene que tener al menos una letra');
  });
});

describe('T06 — HU2: login', () => {
  it('con email y contraseña correctos devuelve un token de 8 horas y el usuario sin datos sensibles (RN5)', async () => {
    const ctx = crearContexto();
    await ctx.crearUsuario('DOCENTE', 'docente@escuela.edu.ar');
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'DOCENTE@escuela.edu.ar', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ email: 'docente@escuela.edu.ar', rol: 'DOCENTE' });
    expect(res.body.usuario.passwordHash).toBeUndefined();
    const datos = jwt.decode(res.body.token) as jwt.JwtPayload;
    expect(datos.exp! - datos.iat!).toBe(8 * 3600);
  });

  it('con contraseña incorrecta o email inexistente responde 401 con el mismo mensaje', async () => {
    const ctx = crearContexto();
    await ctx.crearUsuario('DOCENTE', 'docente@escuela.edu.ar');
    const mal = await request(ctx.app).post('/api/auth/login').send({ email: 'docente@escuela.edu.ar', password: 'otra1234' });
    const noExiste = await request(ctx.app).post('/api/auth/login').send({ email: 'nadie@escuela.edu.ar', password: 'otra1234' });
    expect(mal.status).toBe(401);
    expect(noExiste.status).toBe(401);
    expect(mal.body.error).toBe('Email o contraseña incorrectos');
    expect(noExiste.body.error).toBe(mal.body.error);
  });

  it('RN6: 5 fallos seguidos bloquean la cuenta y el intento correcto antes de 15 minutos da 423', async () => {
    const ctx = crearContexto();
    await ctx.crearUsuario('ESTUDIANTE', 'est@x.com', { comisionId: 1 });
    for (let i = 0; i < 5; i++) {
      await request(ctx.app).post('/api/auth/login').send({ email: 'est@x.com', password: 'mala1234' });
    }
    ctx.reloj.avanzarMinutos(14);
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'est@x.com', password: PASSWORD });
    expect(res.status).toBe(423);
    expect(res.body.error).toContain('bloqueada');
  });

  it('RN6: 4 fallos no bloquean', async () => {
    const ctx = crearContexto();
    await ctx.crearUsuario('ESTUDIANTE', 'est@x.com', { comisionId: 1 });
    for (let i = 0; i < 4; i++) {
      await request(ctx.app).post('/api/auth/login').send({ email: 'est@x.com', password: 'mala1234' });
    }
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'est@x.com', password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it('RN6: a los 15 minutos del bloqueo entra y el contador vuelve a cero', async () => {
    const ctx = crearContexto();
    const u = await ctx.crearUsuario('ESTUDIANTE', 'est@x.com', { comisionId: 1 });
    for (let i = 0; i < 5; i++) {
      await request(ctx.app).post('/api/auth/login').send({ email: 'est@x.com', password: 'mala1234' });
    }
    ctx.reloj.avanzarMinutos(15);
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'est@x.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect((await ctx.repos.usuarios.porId(u.id))?.intentosFallidos).toBe(0);
  });

  it('RN6: un login correcto en el medio reinicia el contador', async () => {
    const ctx = crearContexto();
    await ctx.crearUsuario('ESTUDIANTE', 'est@x.com', { comisionId: 1 });
    const login = (password: string) => request(ctx.app).post('/api/auth/login').send({ email: 'est@x.com', password });
    for (let i = 0; i < 4; i++) await login('mala1234');
    expect((await login(PASSWORD)).status).toBe(200);
    for (let i = 0; i < 4; i++) await login('mala1234');
    expect((await login(PASSWORD)).status).toBe(200);
  });

  it('RN5: el token vence a las 8 horas', async () => {
    const ctx = crearContexto();
    const u = await ctx.crearUsuario('DOCENTE', 'docente@escuela.edu.ar');
    const token = ctx.servicios.auth.emitirToken(u);
    ctx.reloj.avanzarMinutos(8 * 60 - 1);
    expect(ctx.servicios.auth.verificarToken(token).id).toBe(u.id);
    ctx.reloj.avanzarMinutos(2);
    expect(() => ctx.servicios.auth.verificarToken(token)).toThrow('Tu sesión venció');
  });
});
