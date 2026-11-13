import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DatosEntrada } from '../src/dominio/tipos';
import { crearContexto } from './ayudas/contexto';
import { ENTRADA } from './ayudas/datos';

const DATOS = ENTRADA as DatosEntrada;

async function preparar() {
  const ctx = crearContexto();
  const base = await ctx.escenarioBase();
  const auth = ctx.tokenDe(base.estudiante);
  const nueva = (fecha: string) =>
    ctx.repos.entradas.crear({ estudianteId: base.estudiante.id, comisionId: base.comision.id, fecha, datos: DATOS });
  return { ctx, ...base, auth, nueva };
}

describe('T18 — HU14: listar mis entradas', () => {
  it('con 12 entradas muestra 10 de la más nueva a la más vieja y una segunda página con 2 (RN29)', async () => {
    const { ctx, auth, nueva } = await preparar();
    const fechas = ['2026-08-04', '2026-08-06', '2026-08-11', '2026-08-13', '2026-08-18', '2026-08-20',
      '2026-08-25', '2026-08-27', '2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10'];
    for (const f of fechas) await nueva(f);
    const p1 = await request(ctx.app).get('/api/entradas').set('Authorization', auth);
    expect(p1.status).toBe(200);
    expect(p1.body).toMatchObject({ total: 12, pagina: 1, paginas: 2 });
    expect(p1.body.items).toHaveLength(10);
    expect(p1.body.items[0].fecha).toBe('2026-09-10');
    const p2 = await request(ctx.app).get('/api/entradas?pagina=2').set('Authorization', auth);
    expect(p2.body.items.map((e: { fecha: string }) => e.fecha)).toEqual(['2026-08-06', '2026-08-04']);
  });

  it('con el filtro mes 2026-09 y estado OBSERVADA solo muestra las observadas de septiembre (RN29)', async () => {
    const { ctx, auth, nueva } = await preparar();
    const agosto = await nueva('2026-08-27');
    const sept = await nueva('2026-09-03');
    await nueva('2026-09-08');
    for (const e of [agosto, sept]) {
      await ctx.repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
      await ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado: 'OBSERVADA', observadaEn: new Date() });
    }
    const res = await request(ctx.app).get('/api/entradas?mes=2026-09&estado=OBSERVADA').set('Authorization', auth);
    expect(res.body.items.map((e: { id: number }) => e.id)).toEqual([sept.id]);
    expect((await request(ctx.app).get('/api/entradas?mes=2026-9').set('Authorization', auth)).status).toBe(400);
  });
});

describe('T18 — HU9: editar o borrar una entrada', () => {
  it('un BORRADOR se edita con la versión actual y la versión sube a 2 (RN20, RN23)', async () => {
    const { ctx, auth, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    const res = await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', auth)
      .send({ ...ENTRADA, actividad: 'DER terminado y revisado', version: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ actividad: 'DER terminado y revisado', version: 2, estado: 'BORRADOR' });
  });

  it('una entrada ENVIADA o VALIDADA no se edita (RN20)', async () => {
    const { ctx, auth, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    await ctx.repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
    const res = await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', auth).send({ ...ENTRADA, version: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Solo se pueden editar entradas en borrador u observadas');
    await ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado: 'VALIDADA', validadaEn: new Date() });
    expect((await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', auth).send({ ...ENTRADA, version: 3 })).status).toBe(400);
  });

  it('una OBSERVADA se edita pero no se borra (RN20)', async () => {
    const { ctx, auth, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    await ctx.repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
    await ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado: 'OBSERVADA', observadaEn: new Date() });
    const borrar = await request(ctx.app).delete(`/api/entradas/${e.id}?version=3`).set('Authorization', auth);
    expect(borrar.status).toBe(400);
    expect(borrar.body.error).toBe('Solo se pueden borrar entradas en borrador');
    const editar = await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', auth).send({ ...ENTRADA, version: 3 });
    expect(editar.status).toBe(200);
    expect(editar.body.estado).toBe('OBSERVADA');
  });

  it('si otra persona la modificó después de abrirla, guardar da 409 con la versión y el estado actuales (RN23)', async () => {
    const { ctx, auth, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    await ctx.repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
    await ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado: 'OBSERVADA', observadaEn: new Date() });
    const res = await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', auth).send({ ...ENTRADA, version: 1 });
    expect(res.status).toBe(409);
    expect(res.body.detalle).toEqual({ version: 3, estado: 'OBSERVADA' });
  });

  it('la fecha no se cambia y sin versión se rechaza (RN20, RN23)', async () => {
    const { ctx, auth, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    const fecha = await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', auth).send({ ...ENTRADA, version: 1, fecha: '2026-09-10' });
    expect(fecha.body.error).toBe('La fecha de una entrada no se puede cambiar');
    const sinVersion = await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', auth).send(ENTRADA);
    expect(sinVersion.status).toBe(400);
    expect(sinVersion.body.error).toBe('Falta la versión de la entrada que estás modificando');
  });

  it('un BORRADOR se borra con la versión actual (RN20)', async () => {
    const { ctx, auth, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    expect((await request(ctx.app).delete(`/api/entradas/${e.id}?version=1`).set('Authorization', auth)).status).toBe(204);
    expect(await ctx.repos.entradas.porId(e.id)).toBeNull();
  });
});

describe('T18 — RN24: privacidad', () => {
  it('otro estudiante y un docente de otra comisión reciben 404; el docente a cargo y el admin la ven', async () => {
    const { ctx, docente, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    const otraComision = await ctx.crearComision(docente.id, { nombre: 'Otra' });
    const otroEstudiante = await ctx.crearUsuario('ESTUDIANTE', 'otro@x.com', { comisionId: otraComision.id });
    const otroDocente = await ctx.crearUsuario('DOCENTE', 'otrodoc@x.com');
    const admin = await ctx.crearUsuario('ADMIN', 'admin@x.com');
    const ver = (u: { id: number; rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE' }) =>
      request(ctx.app).get(`/api/entradas/${e.id}`).set('Authorization', ctx.tokenDe(u));
    expect((await ver(otroEstudiante)).status).toBe(404);
    expect((await ver(otroDocente)).status).toBe(404);
    expect((await ver(docente)).status).toBe(200);
    expect((await ver(admin)).status).toBe(200);
    const editarAjena = await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', ctx.tokenDe(otroEstudiante)).send({ ...ENTRADA, version: 1 });
    expect(editarAjena.status).toBe(404);
  });
});
