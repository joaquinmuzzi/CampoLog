import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiaNoLaborableDuplicado } from '../../src/repositorios/errores';
import { Repos } from '../../src/repositorios/tipos';
import { FabricaRepos } from './usuariosYComisiones';

export function contratoDiasNoLaborables(nombre: string, fabrica: FabricaRepos) {
  describe(`T13 — contrato de días no laborables (${nombre})`, () => {
    let repos: Repos;
    let limpiar: () => Promise<void>;
    let comisionId: number;
    let otraComisionId: number;

    beforeEach(async () => {
      ({ repos, limpiar } = await fabrica());
      const docente = await repos.usuarios.crear({ nombre: 'Doc', apellido: 'Ente', email: 'd@x.com', passwordHash: 'h', rol: 'DOCENTE', comisionId: null });
      const base = { diasSemana: [2, 4], fechaInicio: '2026-09-01', fechaFin: '2026-11-27', horasJornada: 4, docenteId: docente.id };
      comisionId = (await repos.comisiones.crear({ ...base, nombre: 'A', codigoInscripcion: 'AAAAAA' })).id;
      otraComisionId = (await repos.comisiones.crear({ ...base, nombre: 'B', codigoInscripcion: 'BBBBBB' })).id;
    });
    afterEach(async () => { await limpiar(); });

    it('viene con los feriados nacionales 2026 precargados (RN9)', async () => {
      const feriados = await repos.diasNoLaborables.listarFeriados();
      expect(feriados).toHaveLength(16);
      expect(feriados.find((f) => f.fecha === '2026-05-25')?.motivo).toBe('Día de la Revolución de Mayo');
      expect(feriados.every((f) => f.tipo === 'FERIADO' && f.comisionId === null)).toBe(true);
    });

    it('para una comisión devuelve feriados y sus recesos, pero no los de otra (RN9)', async () => {
      await repos.diasNoLaborables.crear({ fecha: '2026-10-20', motivo: 'Jornada institucional', tipo: 'RECESO', comisionId });
      await repos.diasNoLaborables.crear({ fecha: '2026-10-22', motivo: 'Receso ajeno', tipo: 'RECESO', comisionId: otraComisionId });
      const dias = await repos.diasNoLaborables.paraComision(comisionId);
      expect(dias.some((d) => d.fecha === '2026-10-20')).toBe(true);
      expect(dias.some((d) => d.fecha === '2026-10-22')).toBe(false);
      expect(dias).toHaveLength(17);
    });

    it('rechaza la misma fecha con el mismo alcance, pero permite la misma fecha en otra comisión (RN9)', async () => {
      await repos.diasNoLaborables.crear({ fecha: '2026-10-20', motivo: 'Receso', tipo: 'RECESO', comisionId });
      await expect(
        repos.diasNoLaborables.crear({ fecha: '2026-10-20', motivo: 'Otro', tipo: 'RECESO', comisionId }),
      ).rejects.toBeInstanceOf(DiaNoLaborableDuplicado);
      await expect(
        repos.diasNoLaborables.crear({ fecha: '2026-10-20', motivo: 'Otro', tipo: 'RECESO', comisionId: otraComisionId }),
      ).resolves.toMatchObject({ comisionId: otraComisionId });
      await expect(
        repos.diasNoLaborables.crear({ fecha: '2026-05-25', motivo: 'Repetido', tipo: 'FERIADO', comisionId: null }),
      ).rejects.toBeInstanceOf(DiaNoLaborableDuplicado);
    });

    it('borra un día no laborable', async () => {
      const dia = await repos.diasNoLaborables.crear({ fecha: '2026-10-20', motivo: 'Receso', tipo: 'RECESO', comisionId });
      await repos.diasNoLaborables.borrar(dia.id);
      expect(await repos.diasNoLaborables.porId(dia.id)).toBeNull();
    });
  });
}
