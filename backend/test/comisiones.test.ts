import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ALFABETO_CODIGO, esCodigoValido, generarCodigo } from '../src/dominio/codigo';
import { crearContexto } from './ayudas/contexto';

async function preparar(instante?: string) {
  const ctx = crearContexto(instante);
  const admin = await ctx.crearUsuario('ADMIN', 'admin@x.com');
  const docente = await ctx.crearUsuario('DOCENTE', 'doc@x.com', { nombre: 'Diego', apellido: 'Morales' });
  const datos = {
    nombre: '6° 2° Computación', diasSemana: [4, 2], fechaInicio: '2026-10-01', fechaFin: '2026-11-27',
    horasJornada: 4, docenteId: docente.id,
  };
  const crear = (cuerpo: object) => request(ctx.app).post('/api/comisiones').set('Authorization', ctx.tokenDe(admin)).send(cuerpo);
  return { ctx, admin, docente, datos, crear };
}

describe('T11 — RN7: código de inscripción', () => {
  it('tiene 6 caracteres del alfabeto permitido (sin 0, O, 1 ni I)', () => {
    for (let i = 0; i < 200; i++) expect(esCodigoValido(generarCodigo())).toBe(true);
    expect(ALFABETO_CODIGO).not.toMatch(/[0O1I]/);
    expect(esCodigoValido('ABC10O')).toBe(false);
  });
});

describe('T11 — HU3: gestionar comisiones', () => {
  it('el administrador crea una comisión con código único y días ordenados (RN7)', async () => {
    const { datos, crear } = await preparar();
    const res = await crear(datos);
    expect(res.status).toBe(201);
    expect(esCodigoValido(res.body.codigoInscripcion)).toBe(true);
    expect(res.body.diasSemana).toEqual([2, 4]);
    expect(res.body.docente).toEqual({ id: datos.docenteId, nombre: 'Diego', apellido: 'Morales' });
    const otra = await crear({ ...datos, nombre: 'Otra comisión' });
    expect(otra.body.codigoInscripcion).not.toBe(res.body.codigoInscripcion);
  });

  it('acepta 270 días de duración y rechaza 271 (RN7)', async () => {
    const { datos, crear } = await preparar();
    expect((await crear({ ...datos, fechaInicio: '2026-03-01', fechaFin: '2026-11-26' })).status).toBe(201); // 270
    const res = await crear({ ...datos, fechaInicio: '2026-03-01', fechaFin: '2026-11-27' }); // 271
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La comisión puede durar como máximo 270 días');
  });

  it('rechaza fin anterior al inicio, sábados, días repetidos, horas fuera de 1 a 8 y un docente inexistente', async () => {
    const { datos, crear } = await preparar();
    expect((await crear({ ...datos, fechaFin: '2026-09-30' })).body.error).toBe('La fecha de fin tiene que ser posterior a la de inicio');
    expect((await crear({ ...datos, diasSemana: [6] })).status).toBe(400);
    expect((await crear({ ...datos, diasSemana: [2, 2] })).body.error).toBe('Los días de práctica no se pueden repetir');
    expect((await crear({ ...datos, horasJornada: 9 })).status).toBe(400);
    expect((await crear({ ...datos, horasJornada: 0 })).status).toBe(400);
    expect((await crear({ ...datos, docenteId: 999 })).body.error).toBe('El docente indicado no existe');
  });

  it('en una comisión que ya empezó no se cambian los días pero sí el nombre (RN11)', async () => {
    const { ctx, admin, datos, crear } = await preparar('2026-10-05T10:00:00-03:00');
    const comision = (await crear(datos)).body;
    const patch = (cuerpo: object) =>
      request(ctx.app).patch(`/api/comisiones/${comision.id}`).set('Authorization', ctx.tokenDe(admin)).send(cuerpo);

    const dias = await patch({ diasSemana: [1, 3] });
    expect(dias.status).toBe(400);
    expect(dias.body.error).toContain('ya empezó');

    const nombre = await patch({ nombre: '6° 2° — Prácticas', diasSemana: [2, 4] }); // mismos días: no es un cambio
    expect(nombre.status).toBe(200);
    expect(nombre.body.nombre).toBe('6° 2° — Prácticas');
  });

  it('antes de la fecha de inicio el calendario sí se puede cambiar (RN11)', async () => {
    const { ctx, admin, datos, crear } = await preparar('2026-09-15T10:00:00-03:00');
    const comision = (await crear(datos)).body;
    const res = await request(ctx.app).patch(`/api/comisiones/${comision.id}`).set('Authorization', ctx.tokenDe(admin))
      .send({ diasSemana: [1, 3], horasJornada: 3 });
    expect(res.status).toBe(200);
    expect(res.body.diasSemana).toEqual([1, 3]);
    expect(res.body.horasJornada).toBe(3);
  });

  it('el docente solo ve sus comisiones y una ajena responde 404 (RN24)', async () => {
    const { ctx, docente, datos, crear } = await preparar();
    const otroDocente = await ctx.crearUsuario('DOCENTE', 'otro@x.com');
    const mia = (await crear(datos)).body;
    const ajena = (await crear({ ...datos, nombre: 'Ajena', docenteId: otroDocente.id })).body;

    const lista = await request(ctx.app).get('/api/comisiones').set('Authorization', ctx.tokenDe(docente));
    expect(lista.body.map((c: { id: number }) => c.id)).toEqual([mia.id]);
    expect((await request(ctx.app).get(`/api/comisiones/${ajena.id}`).set('Authorization', ctx.tokenDe(docente))).status).toBe(404);
    expect((await request(ctx.app).get(`/api/comisiones/${mia.id}`).set('Authorization', ctx.tokenDe(docente))).status).toBe(200);
  });

  it('un docente no puede crear comisiones (403)', async () => {
    const { ctx, docente, datos } = await preparar();
    const res = await request(ctx.app).post('/api/comisiones').set('Authorization', ctx.tokenDe(docente)).send(datos);
    expect(res.status).toBe(403);
  });
});
