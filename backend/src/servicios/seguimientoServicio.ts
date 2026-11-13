import { z } from 'zod';
import { esMesValido, mesDe } from '../dominio/fechas';
import { calcularResumen, calendarioDelMes, DiaDelCalendario, Resumen } from '../dominio/seguimiento';
import { aPublico, Comision, Usuario, UsuarioPublico } from '../dominio/tipos';
import { noEncontrado } from '../errores';
import { Reloj } from '../reloj';
import { Repos } from '../repositorios/tipos';

const esquemaMes = z.object({
  mes: z.string().refine(esMesValido, { error: 'El mes tiene que tener el formato AAAA-MM' }).optional(),
});

export interface ResumenDeEstudiante extends Resumen {
  estudiante: UsuarioPublico;
  comision: Pick<Comision, 'id' | 'nombre' | 'horasJornada' | 'fechaInicio' | 'fechaFin' | 'diasSemana'>;
}

export class SeguimientoServicio {
  constructor(private readonly repos: Repos, private readonly reloj: Reloj) {}

  /** HU7 — Calendario del mes de un estudiante (por defecto, el mes actual). */
  async calendario(estudianteId: number, consulta: unknown): Promise<{ mes: string; hoy: string; dias: DiaDelCalendario[] }> {
    const { estudiante, comision } = await this.estudianteYComision(estudianteId);
    const hoy = this.reloj.hoy();
    const mes = esquemaMes.parse(consulta).mes ?? mesDe(hoy);
    const [noLaborables, entradas] = await Promise.all([
      this.repos.diasNoLaborables.paraComision(comision.id),
      this.repos.entradas.todasDeEstudiante(estudiante.id),
    ]);
    return { mes, hoy, dias: calendarioDelMes(comision, noLaborables, entradas, mes, hoy) };
  }

  /** HU12 — Asistencia, riesgo, horas y pendientes (RN25, RN26, RN27). */
  async resumen(estudianteId: number): Promise<ResumenDeEstudiante> {
    const { estudiante, comision } = await this.estudianteYComision(estudianteId);
    return this.resumenCon(estudiante, comision);
  }

  async resumenCon(estudiante: Usuario, comision: Comision): Promise<ResumenDeEstudiante> {
    const [noLaborables, entradas] = await Promise.all([
      this.repos.diasNoLaborables.paraComision(comision.id),
      this.repos.entradas.todasDeEstudiante(estudiante.id),
    ]);
    return {
      estudiante: aPublico(estudiante),
      comision: {
        id: comision.id, nombre: comision.nombre, horasJornada: comision.horasJornada,
        fechaInicio: comision.fechaInicio, fechaFin: comision.fechaFin, diasSemana: comision.diasSemana,
      },
      ...calcularResumen(comision, noLaborables, entradas, this.reloj.hoy()),
    };
  }

  /** HU13 — Estudiantes de una comisión con su situación, primero los que están en riesgo. */
  async estudiantesDeComision(comision: Comision): Promise<ResumenDeEstudiante[]> {
    const estudiantes = await this.repos.usuarios.listarEstudiantesDeComision(comision.id);
    const resumenes = await Promise.all(estudiantes.map((e) => this.resumenCon(e, comision)));
    return resumenes.sort((a, b) => Number(b.enRiesgo) - Number(a.enRiesgo));
  }

  private async estudianteYComision(estudianteId: number) {
    const estudiante = await this.repos.usuarios.porId(estudianteId);
    if (!estudiante?.comisionId) throw noEncontrado('Estudiante');
    const comision = await this.repos.comisiones.porId(estudiante.comisionId);
    if (!comision) throw noEncontrado('Comisión');
    return { estudiante, comision };
  }
}
