import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DatosEntrada } from '../src/dominio/tipos';
import { crearContexto } from './ayudas/contexto';
import { ENTRADA } from './ayudas/datos';

async function preparar() {
  const ctx = crearContexto();
  const base = await ctx.escenarioBase();
  const entrada = await ctx.repos.entradas.crear({
    estudianteId: base.estudiante.id, comisionId: base.comision.id, fecha: '2026-09-15', datos: ENTRADA as DatosEntrada,
  });
  const enviada = await ctx.repos.entradas.actualizarConVersion(entrada.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
  const revisar = (accion: 'validar' | 'observar', cuerpo: object, quien = base.docente) =>
    request(ctx.app).post(`/api/entradas/${entrada.id}/${accion}`).set('Authorization', ctx.tokenDe(quien)).send(cuerpo);
  return { ctx, ...base, entrada: enviada, revisar };
}

describe('T20 — HU11: revisar entradas', () => {
  it('el docente valida una entrada ENVIADA de su comisión y queda VALIDADA (RN19, RN22)', async () => {
    const { revisar, entrada } = await preparar();
    const res = await revisar('validar', { version: entrada.version, comentario: 'Muy buen registro' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'VALIDADA', version: 3 });
    expect(res.body.comentarios[0]).toMatchObject({ tipo: 'VALIDACION', texto: 'Muy buen registro', autorNombre: 'Diego Morales' });
  });

  it('una vez VALIDADA nadie la modifica: ni el estudiante ni una nueva revisión (RN19)', async () => {
    const { ctx, revisar, entrada, estudiante } = await preparar();
    await revisar('validar', { version: entrada.version });
    const editar = await request(ctx.app).patch(`/api/entradas/${entrada.id}`).set('Authorization', ctx.tokenDe(estudiante)).send({ ...ENTRADA, version: 3 });
    expect(editar.status).toBe(400);
    expect((await revisar('observar', { version: 3, comentario: 'Cambié de opinión, revisá esto' })).status).toBe(400);
  });

  it('observar con 5 caracteres se rechaza; con 10 o más pasa a OBSERVADA con el comentario (RN22)', async () => {
    const { revisar, entrada } = await preparar();
    const corta = await revisar('observar', { version: entrada.version, comentario: 'Falta' });
    expect(corta.status).toBe(400);
    expect(corta.body.error).toBe('Para observar una entrada tenés que escribir un comentario de 10 a 500 caracteres');
    const res = await revisar('observar', { version: entrada.version, comentario: 'Falta el link al commit' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('OBSERVADA');
    expect(res.body.observadaEn).toBeTruthy();
    expect(res.body.comentarios[0]).toMatchObject({ tipo: 'OBSERVACION', texto: 'Falta el link al commit' });
  });

  it('una entrada en BORRADOR no se puede validar (RN19, RN22)', async () => {
    const { ctx, docente, estudiante, comision } = await preparar();
    const borrador = await ctx.repos.entradas.crear({ estudianteId: estudiante.id, comisionId: comision.id, fecha: '2026-09-10', datos: ENTRADA as DatosEntrada });
    const res = await request(ctx.app).post(`/api/entradas/${borrador.id}/validar`).set('Authorization', ctx.tokenDe(docente)).send({ version: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Solo se pueden revisar entradas enviadas');
  });

  it('el docente de otra comisión recibe 404 y el estudiante no puede revisar (RN22, RN24)', async () => {
    const { ctx, revisar, entrada, estudiante } = await preparar();
    const otroDocente = await ctx.crearUsuario('DOCENTE', 'otro@x.com');
    expect((await revisar('validar', { version: entrada.version }, otroDocente)).status).toBe(404);
    expect((await revisar('validar', { version: entrada.version }, estudiante)).status).toBe(403);
  });

  it('si el estudiante la editó después de que el docente la abrió, validar da 409 (RN23)', async () => {
    const { ctx, revisar, entrada } = await preparar();
    // El docente la abre con versión 2; mientras tanto la observa y el estudiante la corrige: versión 4.
    await revisar('observar', { version: 2, comentario: 'Agregá el commit, por favor' });
    await ctx.repos.entradas.actualizarConVersion(entrada.id, 3, { datos: ENTRADA as DatosEntrada });
    const res = await revisar('validar', { version: 2 });
    expect(res.status).toBe(409);
    expect(res.body.detalle).toEqual({ version: 4, estado: 'OBSERVADA' });
  });

  it('dos revisiones simultáneas con la misma versión: una gana y la otra recibe 409 (RN23)', async () => {
    const { revisar, entrada } = await preparar();
    const [a, b] = await Promise.all([
      revisar('validar', { version: entrada.version }),
      revisar('observar', { version: entrada.version, comentario: 'Revisá las horas cargadas' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });
});
