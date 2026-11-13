import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearContexto } from './ayudas/contexto';

const nuevoDocente = { nombre: 'Rita', apellido: 'Fasolino', email: 'Rita.Fasolino@escuela.edu.ar', password: 'docente123' };

describe('T09 — HU4: alta de docentes', () => {
  it('el administrador crea un docente que después puede iniciar sesión (RN4, RN2)', async () => {
    const ctx = crearContexto();
    const admin = await ctx.crearUsuario('ADMIN', 'admin@x.com');
    const res = await request(ctx.app).post('/api/docentes').set('Authorization', ctx.tokenDe(admin)).send(nuevoDocente);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ rol: 'DOCENTE', email: 'rita.fasolino@escuela.edu.ar' });
    expect(res.body.passwordHash).toBeUndefined();

    const login = await request(ctx.app).post('/api/auth/login').send({ email: 'rita.fasolino@escuela.edu.ar', password: 'docente123' });
    expect(login.status).toBe(200);
    expect(login.body.usuario.rol).toBe('DOCENTE');

    const lista = await request(ctx.app).get('/api/docentes').set('Authorization', ctx.tokenDe(admin));
    expect(lista.body.map((d: { apellido: string }) => d.apellido)).toEqual(['Fasolino']);
  });

  it('un docente o un estudiante que intenta crear un docente recibe 403 (RN4)', async () => {
    const ctx = crearContexto();
    const docente = await ctx.crearUsuario('DOCENTE', 'doc@x.com');
    const estudiante = await ctx.crearUsuario('ESTUDIANTE', 'est@x.com', { comisionId: 1 });
    for (const u of [docente, estudiante]) {
      const res = await request(ctx.app).post('/api/docentes').set('Authorization', ctx.tokenDe(u)).send(nuevoDocente);
      expect(res.status).toBe(403);
    }
  });

  it('rechaza un email repetido con 409 y una contraseña inválida con 400', async () => {
    const ctx = crearContexto();
    const admin = await ctx.crearUsuario('ADMIN', 'admin@x.com');
    await request(ctx.app).post('/api/docentes').set('Authorization', ctx.tokenDe(admin)).send(nuevoDocente);
    const repetido = await request(ctx.app).post('/api/docentes').set('Authorization', ctx.tokenDe(admin))
      .send({ ...nuevoDocente, email: 'RITA.fasolino@escuela.edu.ar' });
    expect(repetido.status).toBe(409);
    const mala = await request(ctx.app).post('/api/docentes').set('Authorization', ctx.tokenDe(admin))
      .send({ ...nuevoDocente, email: 'otra@x.com', password: 'sinnumeros' });
    expect(mala.status).toBe(400);
    expect(mala.body.error).toBe('La contraseña tiene que tener al menos un número');
  });
});
