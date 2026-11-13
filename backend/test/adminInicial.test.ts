import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearContexto } from './ayudas/contexto';

describe('T07 — RN1: administrador inicial', () => {
  it('si no hay administradores, crea uno con las credenciales iniciales y se puede iniciar sesión', async () => {
    const ctx = crearContexto();
    const creado = await ctx.servicios.auth.asegurarAdminInicial('Coordinacion@Escuela.edu.ar', 'admin1234');
    expect(creado).toBe(true);
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'coordinacion@escuela.edu.ar', password: 'admin1234' });
    expect(res.status).toBe(200);
    expect(res.body.usuario.rol).toBe('ADMIN');
  });

  it('si ya existe un administrador, no crea otro', async () => {
    const ctx = crearContexto();
    await ctx.servicios.auth.asegurarAdminInicial('uno@escuela.edu.ar', 'admin1234');
    const creado = await ctx.servicios.auth.asegurarAdminInicial('otro@escuela.edu.ar', 'admin1234');
    expect(creado).toBe(false);
    expect(await ctx.repos.usuarios.contarPorRol('ADMIN')).toBe(1);
  });

  it('rechaza una contraseña inicial que no cumple RN2', async () => {
    const ctx = crearContexto();
    await expect(ctx.servicios.auth.asegurarAdminInicial('a@escuela.edu.ar', 'corta')).rejects.toThrow();
  });
});
