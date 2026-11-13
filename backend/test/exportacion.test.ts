import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { BOM, generarCsvCarpeta, nombreDeArchivo } from '../src/dominio/csv';
import { DatosEntrada, Entrada } from '../src/dominio/tipos';
import { crearContexto } from './ayudas/contexto';
import { ENTRADA } from './ayudas/datos';

const base = (fecha: string, estado: Entrada['estado'], extra: Partial<Entrada> = {}) => ({
  fecha, estado, actividad: `Actividad del ${fecha}`, horas: 3.5, comentarios: [],
  evidencias: [{ tipo: 'COMMIT' as const, titulo: 'Commit', url: `https://github.com/x/${fecha}` }], ...extra,
});

describe('T24 — RN28: generar el CSV', () => {
  it('incluye solo las validadas, ordenadas por fecha ascendente, con ";" y BOM', () => {
    const csv = generarCsvCarpeta([base('2026-09-10', 'VALIDADA'), base('2026-09-03', 'VALIDADA'), base('2026-09-08', 'BORRADOR')]);
    expect(csv.startsWith(BOM)).toBe(true);
    const lineas = csv.slice(1).trimEnd().split('\r\n');
    expect(lineas[0]).toBe('Fecha;Actividad;Horas;Evidencias;Comentario del docente');
    expect(lineas).toHaveLength(3);
    expect(lineas[1]).toBe('2026-09-03;"Actividad del 2026-09-03";3,5;"https://github.com/x/2026-09-03";""');
    expect(lineas[2].startsWith('2026-09-10;')).toBe(true);
  });

  it('escapa comillas y separa varias evidencias con " | "; usa el comentario de validación', () => {
    const csv = generarCsvCarpeta([base('2026-09-03', 'VALIDADA', {
      actividad: 'Probamos el "login"; anduvo',
      evidencias: [
        { tipo: 'COMMIT', titulo: 'a', url: 'https://a.com' },
        { tipo: 'TAREA', titulo: 'b', url: 'https://b.com' },
      ],
      comentarios: [
        { id: 1, autorId: 1, autorNombre: 'D', tipo: 'OBSERVACION', texto: 'Falta evidencia', creadoEn: new Date() },
        { id: 2, autorId: 1, autorNombre: 'D', tipo: 'VALIDACION', texto: 'Bien', creadoEn: new Date() },
      ],
    })]);
    expect(csv).toContain('"Probamos el ""login""; anduvo"');
    expect(csv).toContain('"https://a.com | https://b.com"');
    expect(csv.trimEnd().endsWith('"Bien"')).toBe(true);
  });

  it('arma el nombre de archivo sin acentos ni espacios', () => {
    expect(nombreDeArchivo('Muzzi Pérez', 'Joaquín')).toBe('carpeta-muzzi-perez-joaquin.csv');
  });
});

describe('T24 — HU15: exportar la carpeta', () => {
  async function preparar() {
    const ctx = crearContexto();
    const b = await ctx.escenarioBase();
    for (const [fecha, validar] of [['2026-09-03', true], ['2026-09-08', false]] as const) {
      const e = await ctx.repos.entradas.crear({ estudianteId: b.estudiante.id, comisionId: b.comision.id, fecha, datos: ENTRADA as DatosEntrada });
      if (validar) {
        await ctx.repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
        await ctx.repos.entradas.actualizarConVersion(e.id, 2, { estado: 'VALIDADA', validadaEn: new Date() });
      }
    }
    return { ctx, ...b };
  }

  it('el estudiante descarga su carpeta con solo las validadas', async () => {
    const { ctx, estudiante } = await preparar();
    const res = await request(ctx.app).get('/api/mi/exportacion').set('Authorization', ctx.tokenDe(estudiante));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe('attachment; filename="carpeta-yavi-kevin.csv"');
    expect(res.text).toContain('2026-09-03');
    expect(res.text).not.toContain('2026-09-08');
  });

  it('su docente la descarga; un docente de otra comisión recibe 404 (RN24, RN28)', async () => {
    const { ctx, docente, estudiante } = await preparar();
    const ok = await request(ctx.app).get(`/api/estudiantes/${estudiante.id}/exportacion`).set('Authorization', ctx.tokenDe(docente));
    expect(ok.status).toBe(200);
    const otro = await ctx.crearUsuario('DOCENTE', 'otro@x.com');
    const no = await request(ctx.app).get(`/api/estudiantes/${estudiante.id}/exportacion`).set('Authorization', ctx.tokenDe(otro));
    expect(no.status).toBe(404);
  });
});
