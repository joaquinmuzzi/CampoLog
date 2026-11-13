import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DatosEntrada, EstadoEntrada } from '../src/dominio/tipos';
import { crearContexto } from './ayudas/contexto';
import { ENTRADA } from './ayudas/datos';

// Hoy: martes 15/09/2026. Comisión de martes y jueves desde el 01/09/2026, 4 horas.
// Días transcurridos: 01, 03, 08, 10 y 15 de septiembre.
async function preparar() {
  const ctx = crearContexto();
  const base = await ctx.escenarioBase();
  const auth = ctx.tokenDe(base.estudiante);
  async function entrada(fecha: string, estado: EstadoEntrada, horas = 4) {
    const e = await ctx.repos.entradas.crear({
      estudianteId: base.estudiante.id, comisionId: base.comision.id, fecha, datos: { ...(ENTRADA as DatosEntrada), horas },
    });
    if (estado === 'BORRADOR') return e;
    await ctx.repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
    if (estado === 'ENVIADA') return e;
    return ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado, validadaEn: new Date(), observadaEn: new Date() });
  }
  return { ctx, ...base, auth, entrada };
}

describe('T22 — HU7: ver mi calendario', () => {
  it('cada día de práctica del mes muestra su estado, y los recesos su motivo (RN8, RN14, RN25)', async () => {
    const { ctx, auth, entrada, comision } = await preparar();
    await entrada('2026-09-08', 'OBSERVADA');
    await ctx.repos.diasNoLaborables.crear({ fecha: '2026-09-17', motivo: 'Jornada institucional', tipo: 'RECESO', comisionId: comision.id });
    const res = await request(ctx.app).get('/api/mi/calendario?mes=2026-09').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.mes).toBe('2026-09');
    const de = (f: string) => res.body.dias.find((d: { fecha: string }) => d.fecha === f);
    expect(de('2026-09-03').tipo).toBe('SIN_REGISTRO');
    expect(de('2026-09-08')).toMatchObject({ tipo: 'CON_ENTRADA', estado: 'OBSERVADA' });
    expect(de('2026-09-10')).toMatchObject({ tipo: 'PENDIENTE', diasRestantes: 2 });
    expect(de('2026-09-17')).toMatchObject({ tipo: 'NO_LABORABLE', motivo: 'Jornada institucional' });
    expect(de('2026-09-22').tipo).toBe('FUTURO');
  });

  it('sin mes, devuelve el mes actual; un mes mal escrito da 400', async () => {
    const { ctx, auth } = await preparar();
    expect((await request(ctx.app).get('/api/mi/calendario').set('Authorization', auth)).body.mes).toBe('2026-09');
    expect((await request(ctx.app).get('/api/mi/calendario?mes=sept').set('Authorization', auth)).status).toBe(400);
  });
});

describe('T22 — HU12: ver mi resumen', () => {
  it('muestra asistencia, horas validadas, horas del calendario y pendientes (RN25, RN26, RN27)', async () => {
    const { ctx, auth, entrada } = await preparar();
    await entrada('2026-09-01', 'VALIDADA', 3);
    await entrada('2026-09-03', 'VALIDADA', 2.5);
    await entrada('2026-09-08', 'ENVIADA');
    const res = await request(ctx.app).get('/api/mi/resumen').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      diasTranscurridos: 5, diasValidados: 2, asistencia: 40, enRiesgo: true, horasValidadas: 5.5, enviadasPorRevisar: 1,
    });
    expect(res.body.horasCalendario).toBe(res.body.diasPractica * 4);
    expect(res.body.pendientes).toEqual([
      { fecha: '2026-09-10', diasRestantes: 2 },
      { fecha: '2026-09-15', diasRestantes: 7 },
    ]);
    expect(res.body.estudiante.passwordHash).toBeUndefined();
  });

  it('solo el estudiante usa /api/mi (un docente recibe 403)', async () => {
    const { ctx, docente } = await preparar();
    expect((await request(ctx.app).get('/api/mi/resumen').set('Authorization', ctx.tokenDe(docente))).status).toBe(403);
  });
});
