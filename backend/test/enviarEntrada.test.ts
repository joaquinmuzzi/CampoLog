import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DatosEntrada } from '../src/dominio/tipos';
import { crearContexto } from './ayudas/contexto';
import { ENTRADA } from './ayudas/datos';

async function preparar() {
  const ctx = crearContexto(); // martes 15/09/2026
  const base = await ctx.escenarioBase();
  const auth = ctx.tokenDe(base.estudiante);
  const nueva = (fecha: string, datos = ENTRADA as DatosEntrada) =>
    ctx.repos.entradas.crear({ estudianteId: base.estudiante.id, comisionId: base.comision.id, fecha, datos });
  // El token se emite en cada pedido porque algunos tests adelantan el reloj más de 8 horas (RN5).
  const enviar = (id: number, version: number) =>
    request(ctx.app).post(`/api/entradas/${id}/enviar`).set('Authorization', ctx.tokenDe(base.estudiante)).send({ version });
  return { ctx, ...base, auth, nueva, enviar };
}

describe('T19 — HU10: enviar a revisión', () => {
  it('un BORRADOR con evidencia y en plazo pasa a ENVIADA (RN19, RN21)', async () => {
    const { enviar, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    const res = await enviar(e.id, 1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'ENVIADA', version: 2 });
    expect(res.body.enviadaEn).toBeTruthy();
  });

  it('un BORRADOR sin evidencias no se envía (RN21)', async () => {
    const { enviar, nueva } = await preparar();
    const e = await nueva('2026-09-15', { ...(ENTRADA as DatosEntrada), evidencias: [] });
    const res = await enviar(e.id, 1);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Para enviar la entrada necesitás cargar al menos una evidencia');
  });

  it('un BORRADOR de hace más de 7 días no se envía (RN21)', async () => {
    const { ctx, enviar, nueva } = await preparar();
    const e = await nueva('2026-09-10');
    ctx.reloj.avanzarDias(3); // viernes 18: el jueves 10 venció el jueves 17
    const res = await enviar(e.id, 1);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Venció el plazo para enviar esta jornada (7 días desde su fecha)');
  });

  it('una OBSERVADA hace 3 días se reenvía; hace 8 días, no (RN21)', async () => {
    const { ctx, enviar, nueva } = await preparar();
    const a = await nueva('2026-09-15');
    const b = await nueva('2026-09-10');
    for (const e of [a, b]) {
      await ctx.repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: ctx.reloj.ahora() });
      await ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado: 'OBSERVADA', observadaEn: ctx.reloj.ahora() });
    }
    ctx.reloj.avanzarDias(3);
    const res = await enviar(a.id, 3);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ENVIADA');
    ctx.reloj.avanzarDias(5); // 8 días desde la observación
    const tarde = await enviar(b.id, 3);
    expect(tarde.status).toBe(400);
    expect(tarde.body.error).toBe('Venció el plazo de corrección (7 días desde la observación)');
  });

  it('una entrada ya ENVIADA o VALIDADA no se vuelve a enviar (RN19)', async () => {
    const { ctx, enviar, nueva } = await preparar();
    const e = await nueva('2026-09-15');
    await enviar(e.id, 1);
    const otraVez = await enviar(e.id, 2);
    expect(otraVez.status).toBe(400);
    expect(otraVez.body.error).toBe('No se puede enviar una entrada enviada');
    await ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado: 'VALIDADA', validadaEn: new Date() });
    expect((await enviar(e.id, 3)).body.error).toBe('No se puede enviar una entrada validada');
  });

  it('con una versión vieja responde 409 (RN23)', async () => {
    const { ctx, enviar, nueva, auth } = await preparar();
    const e = await nueva('2026-09-15');
    await request(ctx.app).patch(`/api/entradas/${e.id}`).set('Authorization', auth).send({ ...ENTRADA, version: 1 });
    expect((await enviar(e.id, 1)).status).toBe(409);
  });
});
