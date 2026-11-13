import { z } from 'zod';
import { DiaNoLaborable } from '../dominio/tipos';
import { esquemaFecha } from '../dominio/validaciones';
import { ErrorNegocio, noEncontrado, sinPermiso } from '../errores';
import { Reloj } from '../reloj';
import { DiaNoLaborableDuplicado } from '../repositorios/errores';
import { Repos } from '../repositorios/tipos';
import { DatosToken } from './authServicio';

const esquemaDia = z.object({
  fecha: esquemaFecha('fecha'),
  motivo: z
    .string({ error: 'El motivo es obligatorio' })
    .trim()
    .min(3, { error: 'El motivo tiene que tener entre 3 y 80 caracteres' })
    .max(80, { error: 'El motivo tiene que tener entre 3 y 80 caracteres' }),
  tipo: z.enum(['FERIADO', 'RECESO'], { error: 'El tipo tiene que ser FERIADO o RECESO' }),
  comisionId: z.number().int().positive().nullish(),
});

export class DiaNoLaborableServicio {
  constructor(private readonly repos: Repos, private readonly reloj: Reloj) {}

  /** Feriados y, si se indica una comisión visible para el usuario, sus recesos. */
  async listar(usuario: DatosToken, comisionId?: number): Promise<DiaNoLaborable[]> {
    const id = comisionId ?? (usuario.rol === 'ESTUDIANTE' ? (await this.repos.usuarios.porId(usuario.id))?.comisionId : undefined);
    if (!id) return this.repos.diasNoLaborables.listarFeriados();
    await this.verificarVisible(usuario, id);
    return this.repos.diasNoLaborables.paraComision(id);
  }

  async crear(usuario: DatosToken, cuerpo: unknown): Promise<DiaNoLaborable> {
    const datos = esquemaDia.parse(cuerpo);
    this.verificarNoRetroactivo(datos.fecha); // RN10
    const comisionId = datos.tipo === 'FERIADO' ? null : datos.comisionId ?? null;
    if (datos.tipo === 'RECESO' && !comisionId) throw new ErrorNegocio(400, 'Un receso tiene que indicar su comisión');
    await this.verificarPermiso(usuario, datos.tipo, comisionId); // RN9
    try {
      return await this.repos.diasNoLaborables.crear({ fecha: datos.fecha, motivo: datos.motivo, tipo: datos.tipo, comisionId });
    } catch (error) {
      if (error instanceof DiaNoLaborableDuplicado) {
        throw new ErrorNegocio(409, 'Ya hay un día no laborable cargado para esa fecha');
      }
      throw error;
    }
  }

  async borrar(usuario: DatosToken, id: number): Promise<void> {
    const dia = await this.repos.diasNoLaborables.porId(id);
    if (!dia) throw noEncontrado('Día no laborable');
    await this.verificarPermiso(usuario, dia.tipo, dia.comisionId); // RN9
    this.verificarNoRetroactivo(dia.fecha); // RN10
    await this.repos.diasNoLaborables.borrar(id);
  }

  /** RN10: solo hoy o fechas futuras. */
  private verificarNoRetroactivo(fecha: string): void {
    if (fecha < this.reloj.hoy()) {
      throw new ErrorNegocio(400, 'Solo se pueden cargar o quitar días no laborables desde hoy en adelante');
    }
  }

  /** RN9: feriados solo el administrador; recesos el administrador o el docente de esa comisión. */
  private async verificarPermiso(usuario: DatosToken, tipo: DiaNoLaborable['tipo'], comisionId: number | null) {
    if (usuario.rol === 'ADMIN') {
      if (comisionId && !(await this.repos.comisiones.porId(comisionId))) throw new ErrorNegocio(400, 'La comisión indicada no existe');
      return;
    }
    if (usuario.rol !== 'DOCENTE' || tipo === 'FERIADO' || !comisionId) throw sinPermiso();
    const comision = await this.repos.comisiones.porId(comisionId);
    if (!comision || comision.docenteId !== usuario.id) throw sinPermiso();
  }

  private async verificarVisible(usuario: DatosToken, comisionId: number) {
    const comision = await this.repos.comisiones.porId(comisionId);
    if (!comision) throw noEncontrado('Comisión');
    if (usuario.rol === 'ADMIN') return;
    if (usuario.rol === 'DOCENTE' && comision.docenteId === usuario.id) return;
    if (usuario.rol === 'ESTUDIANTE' && (await this.repos.usuarios.porId(usuario.id))?.comisionId === comisionId) return;
    throw noEncontrado('Comisión');
  }
}
