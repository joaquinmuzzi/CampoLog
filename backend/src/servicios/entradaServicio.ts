import { z } from 'zod';
import { esDiaDePractica } from '../dominio/calendario';
import { validarDatosEntrada } from '../dominio/entrada';
import { esFechaValida } from '../dominio/fechas';
import { dentroDePlazoDeCarga, esFutura, PLAZO_DIAS } from '../dominio/plazos';
import { Comision, Entrada, Usuario } from '../dominio/tipos';
import { ErrorNegocio, noEncontrado } from '../errores';
import { Reloj } from '../reloj';
import { EntradaDuplicada } from '../repositorios/errores';
import { Repos } from '../repositorios/tipos';
import { DatosToken } from './authServicio';

const esquemaFechaEntrada = z.object({
  fecha: z.string({ error: 'La fecha es obligatoria' }).refine(esFechaValida, { error: 'La fecha no es válida (AAAA-MM-DD)' }),
});

export class EntradaServicio {
  constructor(private readonly repos: Repos, private readonly reloj: Reloj) {}

  /** HU8 — Registrar una jornada. */
  async crear(usuario: DatosToken, cuerpo: unknown): Promise<Entrada> {
    const { estudiante, comision } = await this.estudianteYComision(usuario.id);
    const { fecha } = esquemaFechaEntrada.parse(cuerpo);
    const hoy = this.reloj.hoy();

    if (esFutura(fecha, hoy)) throw new ErrorNegocio(400, 'No se pueden registrar jornadas futuras'); // RN13
    const noLaborables = await this.repos.diasNoLaborables.paraComision(comision.id);
    if (!esDiaDePractica(comision, fecha, noLaborables)) {
      throw new ErrorNegocio(400, 'Esa fecha no es un día de práctica de tu comisión'); // RN12
    }
    if (!dentroDePlazoDeCarga(fecha, hoy)) {
      throw new ErrorNegocio(400, `Venció el plazo de carga: cada jornada se carga hasta ${PLAZO_DIAS} días después`); // RN14
    }
    const datos = validarDatosEntrada(cuerpo, comision.horasJornada); // RN16, RN17, RN18

    try {
      return await this.repos.entradas.crear({ estudianteId: estudiante.id, comisionId: comision.id, fecha, datos });
    } catch (error) {
      if (error instanceof EntradaDuplicada) {
        // RN15: ya existe (por ejemplo, un doble clic): se informa cuál es para poder abrirla.
        const existente = (await this.repos.entradas.todasDeEstudiante(estudiante.id)).find((e) => e.fecha === fecha);
        throw new ErrorNegocio(409, 'Ya tenés una entrada para ese día', existente ? { id: existente.id } : undefined);
      }
      throw error;
    }
  }

  protected async estudianteYComision(estudianteId: number): Promise<{ estudiante: Usuario; comision: Comision }> {
    const estudiante = await this.repos.usuarios.porId(estudianteId);
    if (!estudiante?.comisionId) throw noEncontrado('Estudiante');
    const comision = await this.repos.comisiones.porId(estudiante.comisionId);
    if (!comision) throw noEncontrado('Comisión');
    return { estudiante, comision };
  }
}
