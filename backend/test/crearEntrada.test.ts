import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { NuevaComision } from '../src/dominio/tipos';
import { crearContexto } from './ayudas/contexto';
import { ENTRADA } from './ayudas/datos';

// Hoy: martes 15/09/2026. Comisión de martes y jueves desde el 01/09, 4 horas por jornada.
async function preparar(extraComision: Partial<NuevaComision> = {}) {
  const ctx = crearContexto();
  const base = await ctx.escenarioBase(extraComision);
  const crear = (cuerpo: object) =>
    request(ctx.app).post('/api/entradas').set('Authorization', ctx.tokenDe(base.estudiante)).send(cuerpo);
  return { ctx, ...base, crear };
}

describe('T17 — HU8: registrar una jornada', () => {
  it('en un día de práctica transcurrido y en plazo queda en BORRADOR con versión 1 (RN12, RN14, RN19)', async () => {
    const { crear, estudiante, comision } = await preparar();
    const res = await crear({ ...ENTRADA, fecha: '2026-09-15' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      estado: 'BORRADOR', version: 1, fecha: '2026-09-15', estudianteId: estudiante.id, comisionId: comision.id, horas: 3.5,
    });
    expect(res.body.evidencias).toEqual(ENTRADA.evidencias);
  });

  it('un sábado, un día que no es de la comisión o un feriado se rechazan (RN12)', async () => {
    const { ctx, crear, comision, docente } = await preparar();
    await ctx.repos.diasNoLaborables.crear({ fecha: '2026-09-10', motivo: 'Receso', tipo: 'RECESO', comisionId: comision.id });
    for (const fecha of ['2026-09-12', '2026-09-14', '2026-09-10']) {
      const res = await crear({ ...ENTRADA, fecha });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Esa fecha no es un día de práctica de tu comisión');
    }
    expect(docente).toBeDefined();
  });

  it('una fecha de mañana se rechaza (RN13)', async () => {
    const { crear } = await preparar({ diasSemana: [1, 2, 3, 4, 5] });
    const res = await crear({ ...ENTRADA, fecha: '2026-09-16' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No se pueden registrar jornadas futuras');
  });

  it('hace 7 días se acepta y hace 8 días se rechaza por plazo vencido (RN14)', async () => {
    const { crear } = await preparar({ diasSemana: [1, 2, 3, 4, 5] });
    expect((await crear({ ...ENTRADA, fecha: '2026-09-08' })).status).toBe(201);
    const res = await crear({ ...ENTRADA, fecha: '2026-09-07' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Venció el plazo de carga: cada jornada se carga hasta 7 días después');
  });

  it('2,3 horas o más horas que la jornada se rechazan (RN16)', async () => {
    const { crear } = await preparar();
    expect((await crear({ ...ENTRADA, fecha: '2026-09-15', horas: 2.3 })).status).toBe(400);
    const mas = await crear({ ...ENTRADA, fecha: '2026-09-15', horas: 4.5 });
    expect(mas.status).toBe(400);
    expect(mas.body.error).toContain('entre 0,5 y 4');
  });

  it('una evidencia con URL "ftp://x" se rechaza (RN18)', async () => {
    const { crear } = await preparar();
    const res = await crear({ ...ENTRADA, fecha: '2026-09-15', evidencias: [{ tipo: 'OTRO', titulo: 'Archivo', url: 'ftp://x' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El link de la evidencia tiene que empezar con http:// o https://');
  });

  it('una segunda entrada para la misma fecha da 409 e informa cuál es (RN15)', async () => {
    const { crear } = await preparar();
    const primera = await crear({ ...ENTRADA, fecha: '2026-09-15' });
    const segunda = await crear({ ...ENTRADA, fecha: '2026-09-15' });
    expect(segunda.status).toBe(409);
    expect(segunda.body).toEqual({ error: 'Ya tenés una entrada para ese día', detalle: { id: primera.body.id } });
  });

  it('dos pedidos simultáneos para la misma fecha dejan una sola entrada y uno recibe 409 (RN15)', async () => {
    const { ctx, crear, estudiante } = await preparar();
    const respuestas = await Promise.all([crear({ ...ENTRADA, fecha: '2026-09-15' }), crear({ ...ENTRADA, fecha: '2026-09-15' })]);
    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await ctx.repos.entradas.todasDeEstudiante(estudiante.id)).toHaveLength(1);
  });

  it('una fecha mal escrita da 400 y un docente no puede crear entradas (403)', async () => {
    const { ctx, crear, docente } = await preparar();
    expect((await crear({ ...ENTRADA, fecha: '15/09/2026' })).body.error).toBe('La fecha no es válida (AAAA-MM-DD)');
    const res = await request(ctx.app).post('/api/entradas').set('Authorization', ctx.tokenDe(docente)).send({ ...ENTRADA, fecha: '2026-09-15' });
    expect(res.status).toBe(403);
  });
});
