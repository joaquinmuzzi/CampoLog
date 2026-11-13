import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatosEntrada } from '../../src/dominio/tipos';
import { EntradaDuplicada, VersionDesactualizada } from '../../src/repositorios/errores';
import { Repos } from '../../src/repositorios/tipos';
import { FabricaRepos } from './usuariosYComisiones';

export const DATOS: DatosEntrada = {
  actividad: 'Terminamos el DER',
  descripcion: 'Claves foráneas y cardinalidades',
  horas: 3.5,
  etiquetas: ['base de datos', 'diseño'],
  evidencias: [
    { tipo: 'DOCUMENTO', titulo: 'DER en Drive', url: 'https://drive.google.com/der' },
    { tipo: 'COMMIT', titulo: 'Commit del esquema', url: 'https://github.com/x/y/commit/abc' },
  ],
};

export function contratoEntradas(nombre: string, fabrica: FabricaRepos) {
  describe(`T16 — contrato de entradas (${nombre})`, () => {
    let repos: Repos;
    let limpiar: () => Promise<void>;
    let estudianteId: number;
    let comisionId: number;
    let docenteId: number;

    beforeEach(async () => {
      ({ repos, limpiar } = await fabrica());
      const docente = await repos.usuarios.crear({ nombre: 'Diego', apellido: 'Morales', email: 'd@x.com', passwordHash: 'h', rol: 'DOCENTE', comisionId: null });
      docenteId = docente.id;
      comisionId = (await repos.comisiones.crear({
        nombre: 'C', diasSemana: [2, 4], fechaInicio: '2026-08-01', fechaFin: '2026-11-27', horasJornada: 4,
        codigoInscripcion: 'CCCCCC', docenteId,
      })).id;
      estudianteId = (await repos.usuarios.crear({ nombre: 'Kevin', apellido: 'Yavi', email: 'k@x.com', passwordHash: 'h', rol: 'ESTUDIANTE', comisionId })).id;
    });
    afterEach(async () => { await limpiar(); });

    const crear = (fecha: string, datos = DATOS) => repos.entradas.crear({ estudianteId, comisionId, fecha, datos });

    it('crea una entrada en BORRADOR, versión 1, con sus evidencias en orden', async () => {
      const e = await crear('2026-09-15');
      expect(e).toMatchObject({ estado: 'BORRADOR', version: 1, fecha: '2026-09-15', horas: 3.5, etiquetas: ['base de datos', 'diseño'] });
      expect(e.evidencias).toEqual(DATOS.evidencias);
      expect((await repos.entradas.porId(e.id))?.evidencias.map((x) => x.tipo)).toEqual(['DOCUMENTO', 'COMMIT']);
    });

    it('rechaza una segunda entrada del mismo estudiante en la misma fecha (RN15)', async () => {
      await crear('2026-09-15');
      await expect(crear('2026-09-15')).rejects.toBeInstanceOf(EntradaDuplicada);
    });

    it('actualiza con la versión correcta: suma 1 y reemplaza las evidencias (RN23)', async () => {
      const e = await crear('2026-09-15');
      const nueva = await repos.entradas.actualizarConVersion(e.id, 1, {
        datos: { ...DATOS, actividad: 'DER corregido', evidencias: [DATOS.evidencias[1]] },
      });
      expect(nueva.version).toBe(2);
      expect(nueva.actividad).toBe('DER corregido');
      expect(nueva.evidencias).toEqual([DATOS.evidencias[1]]);
    });

    it('rechaza actualizar o borrar con una versión vieja (RN23)', async () => {
      const e = await crear('2026-09-15');
      await repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
      await expect(repos.entradas.actualizarConVersion(e.id, 1, { estado: 'VALIDADA' })).rejects.toBeInstanceOf(VersionDesactualizada);
      await expect(repos.entradas.borrarConVersion(e.id, 1)).rejects.toBeInstanceOf(VersionDesactualizada);
      expect((await repos.entradas.porId(e.id))?.estado).toBe('ENVIADA');
    });

    it('guarda comentarios con el nombre del autor y cambia el estado', async () => {
      const e = await crear('2026-09-15');
      await repos.entradas.actualizarConVersion(e.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
      const obs = await repos.entradas.actualizarConVersion(e.id, 2, {
        estado: 'OBSERVADA', observadaEn: new Date(), comentario: { autorId: docenteId, tipo: 'OBSERVACION', texto: 'Falta el link al commit' },
      });
      expect(obs.estado).toBe('OBSERVADA');
      expect(obs.observadaEn).toBeInstanceOf(Date);
      expect(obs.comentarios).toHaveLength(1);
      expect(obs.comentarios[0]).toMatchObject({ autorId: docenteId, autorNombre: 'Diego Morales', tipo: 'OBSERVACION', texto: 'Falta el link al commit' });
    });

    it('borra con la versión correcta', async () => {
      const e = await crear('2026-09-15');
      await repos.entradas.borrarConVersion(e.id, 1);
      expect(await repos.entradas.porId(e.id)).toBeNull();
    });

    it('lista de a 10 por fecha descendente, con total, y filtra por mes y estado (RN29)', async () => {
      const fechas = ['2026-08-04', '2026-08-06', '2026-08-11', '2026-08-13', '2026-08-18', '2026-08-20',
        '2026-08-25', '2026-08-27', '2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10'];
      for (const f of fechas) await crear(f);
      const p1 = await repos.entradas.listar({ estudianteId, pagina: 1 });
      expect(p1.total).toBe(12);
      expect(p1.items).toHaveLength(10);
      expect(p1.items[0].fecha).toBe('2026-09-10');
      expect(p1.items[9].fecha).toBe('2026-08-11');
      const p2 = await repos.entradas.listar({ estudianteId, pagina: 2 });
      expect(p2.items.map((e) => e.fecha)).toEqual(['2026-08-06', '2026-08-04']);

      const sept = await repos.entradas.listar({ estudianteId, pagina: 1, mes: '2026-09' });
      expect(sept.total).toBe(4);
      const primera = (await repos.entradas.listar({ estudianteId, pagina: 1, mes: '2026-09' })).items[0];
      await repos.entradas.actualizarConVersion(primera.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
      const enviadas = await repos.entradas.listar({ estudianteId, pagina: 1, mes: '2026-09', estado: 'ENVIADA' });
      expect(enviadas.items.map((e) => e.fecha)).toEqual(['2026-09-10']);
      expect(await repos.entradas.todasDeEstudiante(estudianteId)).toHaveLength(12);
    });
  });
}
