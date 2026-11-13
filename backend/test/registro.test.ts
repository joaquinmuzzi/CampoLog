import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearContexto } from './ayudas/contexto';

async function preparar() {
  const ctx = crearContexto();
  const docente = await ctx.crearUsuario('DOCENTE', 'doc@x.com');
  const comision = await ctx.crearComision(docente.id, { codigoInscripcion: 'PPK7Q2' });
  const datos = { nombre: 'Santino', apellido: 'Portaluppi', email: 'Santino@x.com', password: 'clave1234', codigoInscripcion: 'ppk7q2' };
  const registrar = (cuerpo: object) => request(ctx.app).post('/api/auth/registro').send(cuerpo);
  return { ctx, comision, datos, registrar };
}

describe('T12 — HU1: registro de estudiantes', () => {
  it('con un código válido crea la cuenta en esa comisión e inicia sesión (RN2, RN3)', async () => {
    const { ctx, comision, datos, registrar } = await preparar();
    const res = await registrar(datos);
    expect(res.status).toBe(201);
    expect(res.body.usuario).toMatchObject({ rol: 'ESTUDIANTE', comisionId: comision.id, email: 'santino@x.com' });
    const yo = await request(ctx.app).get('/api/auth/yo').set('Authorization', `Bearer ${res.body.token}`);
    expect(yo.body.comision.id).toBe(comision.id);
  });

  it('con un código inexistente se rechaza con el mensaje de la spec (RN3)', async () => {
    const { datos, registrar } = await preparar();
    const res = await registrar({ ...datos, codigoInscripcion: 'ZZZZZZ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El código de inscripción no corresponde a ninguna comisión');
  });

  it('con un email ya usado (aunque cambien las mayúsculas) se rechaza (RN2)', async () => {
    const { datos, registrar } = await preparar();
    await registrar(datos);
    const res = await registrar({ ...datos, email: 'SANTINO@X.COM' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe una cuenta con ese email');
  });

  it('con la contraseña "abcdefgh" se rechaza porque le falta un número (RN2)', async () => {
    const { datos, registrar } = await preparar();
    const res = await registrar({ ...datos, password: 'abcdefgh' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La contraseña tiene que tener al menos un número');
  });

  it('valida nombre y apellido de 2 a 60 caracteres (RN3)', async () => {
    const { datos, registrar } = await preparar();
    const res = await registrar({ ...datos, nombre: 'S' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El nombre tiene que tener entre 2 y 60 caracteres');
  });
});
