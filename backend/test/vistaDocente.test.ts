import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DatosEntrada } from '../src/dominio/tipos';
import { crearContexto } from './ayudas/contexto';
import { ENTRADA } from './ayudas/datos';

// Hoy: martes 15/09/2026; 5 días transcurridos (01, 03, 08, 10 y 15 de septiembre).
async function preparar() {
  const ctx = crearContexto();
  const base = await ctx.escenarioBase();
  const cumplidor = await ctx.crearUsuario('ESTUDIANTE', 'juan@x.com', { comisionId: base.comision.id, nombre: 'Juan', apellido: 'Hracek' });
  for (const fecha of ['2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10']) {
    const e = await ctx.repos.entradas.crear({ estudianteId: cumplidor.id, comisionId: base.comision.id, fecha, datos: ENTRADA as DatosEntrada });
    await ctx.repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
    await ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado: 'VALIDADA', validadaEn: new Date() });
  }
  const pendiente = await ctx.repos.entradas.crear({ estudianteId: cumplidor.id, comisionId: base.comision.id, fecha: '2026-09-15', datos: ENTRADA as DatosEntrada });
  await ctx.repos.entradas.actualizarConVersion(pendiente.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
  return { ctx, ...base, cumplidor };
}

describe('T23 — HU13: seguir a mis estudiantes', () => {
  it('lista los estudiantes con asistencia, horas, enviadas por revisar y riesgo, primero los que están en riesgo', async () => {
    const { ctx, docente, comision, estudiante, cumplidor } = await preparar();
    const res = await request(ctx.app).get(`/api/comisiones/${comision.id}/estudiantes`).set('Authorization', ctx.tokenDe(docente));
    expect(res.status).toBe(200);
    expect(res.body.map((r: { estudiante: { id: number } }) => r.estudiante.id)).toEqual([estudiante.id, cumplidor.id]);
    expect(res.body[0]).toMatchObject({ asistencia: 0, enRiesgo: true, horasValidadas: 0, enviadasPorRevisar: 0 });
    expect(res.body[1]).toMatchObject({ asistencia: 80, enRiesgo: false, horasValidadas: 14, enviadasPorRevisar: 1 });
  });

  it('una comisión que no es del docente responde 404 (RN24)', async () => {
    const { ctx, comision } = await preparar();
    const otro = await ctx.crearUsuario('DOCENTE', 'otro@x.com');
    const res = await request(ctx.app).get(`/api/comisiones/${comision.id}/estudiantes`).set('Authorization', ctx.tokenDe(otro));
    expect(res.status).toBe(404);
  });

  it('el docente ve las entradas y el resumen de un estudiante suyo; el de otra comisión, 404 (RN24)', async () => {
    const { ctx, docente, cumplidor } = await preparar();
    const entradas = await request(ctx.app).get(`/api/estudiantes/${cumplidor.id}/entradas?estado=ENVIADA`).set('Authorization', ctx.tokenDe(docente));
    expect(entradas.status).toBe(200);
    expect(entradas.body.items.map((e: { fecha: string }) => e.fecha)).toEqual(['2026-09-15']);
    const resumen = await request(ctx.app).get(`/api/estudiantes/${cumplidor.id}/resumen`).set('Authorization', ctx.tokenDe(docente));
    expect(resumen.body.asistencia).toBe(80);

    const otro = await ctx.crearUsuario('DOCENTE', 'otro@x.com');
    expect((await request(ctx.app).get(`/api/estudiantes/${cumplidor.id}/entradas`).set('Authorization', ctx.tokenDe(otro))).status).toBe(404);
    expect((await request(ctx.app).get(`/api/estudiantes/${docente.id}/resumen`).set('Authorization', ctx.tokenDe(docente))).status).toBe(404);
  });

  it('un estudiante no puede usar la vista del docente (403)', async () => {
    const { ctx, estudiante, cumplidor } = await preparar();
    expect((await request(ctx.app).get(`/api/estudiantes/${cumplidor.id}/entradas`).set('Authorization', ctx.tokenDe(estudiante))).status).toBe(403);
  });
});
