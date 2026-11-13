import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Repos } from '../../src/repositorios/tipos';
import { CodigoDuplicado, EmailDuplicado } from '../../src/repositorios/errores';

export type FabricaRepos = () => Promise<{ repos: Repos; limpiar: () => Promise<void> }>;

const docenteBase = {
  nombre: 'Diego', apellido: 'Morales', email: 'Diego.Morales@escuela.edu.ar', passwordHash: 'hash', rol: 'DOCENTE' as const,
  comisionId: null,
};

/** Tests de contrato: cualquier implementación de los repositorios tiene que cumplirlos. */
export function contratoUsuariosYComisiones(nombre: string, fabrica: FabricaRepos) {
  describe(`T05 — contrato de usuarios y comisiones (${nombre})`, () => {
    let repos: Repos;
    let limpiar: () => Promise<void>;

    beforeEach(async () => { ({ repos, limpiar } = await fabrica()); });
    afterEach(async () => { await limpiar(); });

    it('crea un usuario guardando el email en minúsculas y lo encuentra sin distinguir mayúsculas (RN2)', async () => {
      const creado = await repos.usuarios.crear(docenteBase);
      expect(creado.id).toBeGreaterThan(0);
      expect(creado.email).toBe('diego.morales@escuela.edu.ar');
      expect(creado.intentosFallidos).toBe(0);
      const encontrado = await repos.usuarios.porEmail('DIEGO.MORALES@escuela.edu.ar');
      expect(encontrado?.id).toBe(creado.id);
    });

    it('rechaza un email repetido con EmailDuplicado (RN2)', async () => {
      await repos.usuarios.crear(docenteBase);
      await expect(repos.usuarios.crear({ ...docenteBase, email: 'diego.morales@ESCUELA.edu.ar' })).rejects.toBeInstanceOf(
        EmailDuplicado,
      );
    });

    it('guarda los intentos fallidos y el bloqueo (RN6)', async () => {
      const u = await repos.usuarios.crear(docenteBase);
      const hasta = new Date('2026-09-15T15:15:00Z');
      await repos.usuarios.actualizarSeguridad(u.id, 5, hasta);
      const leido = await repos.usuarios.porId(u.id);
      expect(leido?.intentosFallidos).toBe(5);
      expect(leido?.bloqueadoHasta?.toISOString()).toBe(hasta.toISOString());
      expect(await repos.usuarios.contarPorRol('DOCENTE')).toBe(1);
    });

    it('crea comisiones, las busca por código y por docente, y las actualiza', async () => {
      const docente = await repos.usuarios.crear(docenteBase);
      const comision = await repos.comisiones.crear({
        nombre: '6° 2° Computación', diasSemana: [2, 4], fechaInicio: '2026-03-02', fechaFin: '2026-11-27',
        horasJornada: 4, codigoInscripcion: 'ABC234', docenteId: docente.id,
      });
      expect(comision.diasSemana).toEqual([2, 4]);
      expect(comision.fechaInicio).toBe('2026-03-02');
      expect((await repos.comisiones.porCodigo('ABC234'))?.id).toBe(comision.id);
      expect(await repos.comisiones.listarPorDocente(docente.id)).toHaveLength(1);

      const editada = await repos.comisiones.actualizar(comision.id, { nombre: '6° 2° Computación — PP' });
      expect(editada.nombre).toBe('6° 2° Computación — PP');
      expect(editada.horasJornada).toBe(4);

      const estudiante = await repos.usuarios.crear({
        nombre: 'Kevin', apellido: 'Yavi', email: 'kevin@x.com', passwordHash: 'h', rol: 'ESTUDIANTE', comisionId: comision.id,
      });
      expect((await repos.usuarios.listarEstudiantesDeComision(comision.id)).map((e) => e.id)).toEqual([estudiante.id]);
    });

    it('rechaza un código de inscripción repetido con CodigoDuplicado (RN7)', async () => {
      const docente = await repos.usuarios.crear(docenteBase);
      const datos = {
        nombre: 'C1', diasSemana: [1], fechaInicio: '2026-03-02', fechaFin: '2026-06-30', horasJornada: 4,
        codigoInscripcion: 'ZZZ999', docenteId: docente.id,
      };
      await repos.comisiones.crear(datos);
      await expect(repos.comisiones.crear({ ...datos, nombre: 'C2' })).rejects.toBeInstanceOf(CodigoDuplicado);
    });
  });
}
