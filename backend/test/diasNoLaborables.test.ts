import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearContexto } from './ayudas/contexto';

// Hoy: martes 15/09/2026.
async function preparar() {
  const ctx = crearContexto();
  const admin = await ctx.crearUsuario('ADMIN', 'admin@x.com');
  const { docente, comision, estudiante } = await ctx.escenarioBase();
  const otroDocente = await ctx.crearUsuario('DOCENTE', 'otro@x.com');
  const ajena = await ctx.crearComision(otroDocente.id, { nombre: 'Ajena' });
  const post = (u: { id: number; rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE' }, cuerpo: object) =>
    request(ctx.app).post('/api/dias-no-laborables').set('Authorization', ctx.tokenDe(u)).send(cuerpo);
  return { ctx, admin, docente, comision, estudiante, ajena, post };
}

describe('T13 — HU5: feriados', () => {
  it('recién instalado, el sistema tiene los feriados nacionales 2026 (RN9)', async () => {
    const { ctx, estudiante } = await preparar();
    const res = await request(ctx.app).get('/api/dias-no-laborables').set('Authorization', ctx.tokenDe(estudiante));
    expect(res.status).toBe(200);
    expect(res.body.map((d: { fecha: string }) => d.fecha)).toContain('2026-07-09');
  });

  it('el administrador agrega un feriado futuro y aparece para todas las comisiones (RN9)', async () => {
    const { ctx, admin, comision, ajena, post } = await preparar();
    const res = await post(admin, { fecha: '2026-10-29', motivo: 'Feriado puente', tipo: 'FERIADO' });
    expect(res.status).toBe(201);
    expect(res.body.comisionId).toBeNull();
    for (const c of [comision, ajena]) {
      const lista = await request(ctx.app).get(`/api/dias-no-laborables?comisionId=${c.id}`).set('Authorization', ctx.tokenDe(admin));
      expect(lista.body.some((d: { fecha: string }) => d.fecha === '2026-10-29')).toBe(true);
    }
  });

  it('una fecha pasada no se puede agregar ni borrar (RN10)', async () => {
    const { ctx, admin, post } = await preparar();
    const ayer = await post(admin, { fecha: '2026-09-14', motivo: 'Tarde', tipo: 'FERIADO' });
    expect(ayer.status).toBe(400);
    expect(ayer.body.error).toBe('Solo se pueden cargar o quitar días no laborables desde hoy en adelante');

    const feriados = await request(ctx.app).get('/api/dias-no-laborables').set('Authorization', ctx.tokenDe(admin));
    const pasado = feriados.body.find((d: { fecha: string }) => d.fecha === '2026-08-17');
    const borrar = await request(ctx.app).delete(`/api/dias-no-laborables/${pasado.id}`).set('Authorization', ctx.tokenDe(admin));
    expect(borrar.status).toBe(400);
  });

  it('hoy sí se puede cargar (RN10) y un feriado repetido da 409 (RN9)', async () => {
    const { admin, post } = await preparar();
    expect((await post(admin, { fecha: '2026-09-15', motivo: 'Asueto', tipo: 'FERIADO' })).status).toBe(201);
    const repetido = await post(admin, { fecha: '2026-10-12', motivo: 'Otra vez', tipo: 'FERIADO' });
    expect(repetido.status).toBe(409);
    expect(repetido.body.error).toBe('Ya hay un día no laborable cargado para esa fecha');
  });
});

describe('T13 — HU6: recesos del docente', () => {
  it('el docente carga un receso futuro en su comisión y solo la afecta a ella (RN9)', async () => {
    const { ctx, docente, comision, ajena, admin, post } = await preparar();
    const res = await post(docente, { fecha: '2026-10-20', motivo: 'Jornada institucional', tipo: 'RECESO', comisionId: comision.id });
    expect(res.status).toBe(201);
    const deAjena = await request(ctx.app).get(`/api/dias-no-laborables?comisionId=${ajena.id}`).set('Authorization', ctx.tokenDe(admin));
    expect(deAjena.body.some((d: { fecha: string }) => d.fecha === '2026-10-20')).toBe(false);
  });

  it('en una comisión que no es suya recibe 403 (HU6)', async () => {
    const { docente, ajena, post } = await preparar();
    const res = await post(docente, { fecha: '2026-10-20', motivo: 'Receso', tipo: 'RECESO', comisionId: ajena.id });
    expect(res.status).toBe(403);
  });

  it('el docente no puede cargar feriados ni el estudiante recesos (403)', async () => {
    const { docente, estudiante, comision, post } = await preparar();
    expect((await post(docente, { fecha: '2026-10-20', motivo: 'Feriado', tipo: 'FERIADO' })).status).toBe(403);
    expect((await post(estudiante, { fecha: '2026-10-20', motivo: 'Receso', tipo: 'RECESO', comisionId: comision.id })).status).toBe(403);
  });

  it('un receso repetido en la misma comisión da 409 y el docente puede borrar uno futuro (RN9)', async () => {
    const { ctx, docente, comision, post } = await preparar();
    const cuerpo = { fecha: '2026-10-20', motivo: 'Receso', tipo: 'RECESO', comisionId: comision.id };
    const creado = await post(docente, cuerpo);
    expect((await post(docente, cuerpo)).status).toBe(409);
    const borrar = await request(ctx.app).delete(`/api/dias-no-laborables/${creado.body.id}`).set('Authorization', ctx.tokenDe(docente));
    expect(borrar.status).toBe(204);
  });

  it('el estudiante ve los recesos de su comisión sin indicarla', async () => {
    const { ctx, docente, estudiante, comision, post } = await preparar();
    await post(docente, { fecha: '2026-10-20', motivo: 'Receso', tipo: 'RECESO', comisionId: comision.id });
    const res = await request(ctx.app).get('/api/dias-no-laborables').set('Authorization', ctx.tokenDe(estudiante));
    expect(res.body.some((d: { fecha: string }) => d.fecha === '2026-10-20')).toBe(true);
  });
});
