import { generarCodigo } from '../dominio/codigo';
import { Comision } from '../dominio/tipos';
import { esquemaCamposComision, validarFechasComision } from '../dominio/validaciones';
import { ErrorNegocio, noEncontrado } from '../errores';
import { Reloj } from '../reloj';
import { CodigoDuplicado } from '../repositorios/errores';
import { Repos } from '../repositorios/tipos';
import { DatosToken } from './authServicio';

export interface ComisionVista extends Comision {
  docente: { id: number; nombre: string; apellido: string } | null;
}

const CAMPOS_DE_CALENDARIO = ['diasSemana', 'fechaInicio', 'fechaFin', 'horasJornada'] as const;

export class ComisionServicio {
  constructor(private readonly repos: Repos, private readonly reloj: Reloj) {}

  async crear(cuerpo: unknown): Promise<ComisionVista> {
    const datos = esquemaCamposComision.parse(cuerpo);
    validarFechasComision(datos.fechaInicio, datos.fechaFin); // RN7
    await this.verificarDocente(datos.docenteId);
    // RN7: código único; si por azar se repite, se genera otro.
    for (let intento = 0; intento < 5; intento++) {
      try {
        return this.conDocente(await this.repos.comisiones.crear({ ...datos, codigoInscripcion: generarCodigo() }));
      } catch (error) {
        if (!(error instanceof CodigoDuplicado)) throw error;
      }
    }
    throw new Error('No se pudo generar un código de inscripción único');
  }

  async listar(usuario: DatosToken): Promise<ComisionVista[]> {
    const comisiones = usuario.rol === 'ADMIN'
      ? await this.repos.comisiones.listar()
      : await this.repos.comisiones.listarPorDocente(usuario.id);
    return Promise.all(comisiones.map((c) => this.conDocente(c)));
  }

  /** RN24: el docente solo ve sus comisiones; si no es suya, responde 404. */
  async obtenerVisible(usuario: DatosToken, id: number): Promise<Comision> {
    const comision = await this.repos.comisiones.porId(id);
    if (!comision) throw noEncontrado('Comisión');
    if (usuario.rol === 'ADMIN') return comision;
    if (usuario.rol === 'DOCENTE' && comision.docenteId === usuario.id) return comision;
    throw noEncontrado('Comisión');
  }

  async obtener(usuario: DatosToken, id: number): Promise<ComisionVista> {
    return this.conDocente(await this.obtenerVisible(usuario, id));
  }

  async actualizar(id: number, cuerpo: unknown): Promise<ComisionVista> {
    const actual = await this.repos.comisiones.porId(id);
    if (!actual) throw noEncontrado('Comisión');
    const cambios = esquemaCamposComision.partial().parse(cuerpo);

    // RN11: días, fechas y horas por jornada solo se modifican antes de la fecha de inicio.
    const cambiaCalendario = CAMPOS_DE_CALENDARIO.some(
      (campo) => cambios[campo] !== undefined && JSON.stringify(cambios[campo]) !== JSON.stringify(actual[campo]),
    );
    if (cambiaCalendario && this.reloj.hoy() >= actual.fechaInicio) {
      throw new ErrorNegocio(
        400,
        'La comisión ya empezó: sus días de práctica, fechas y horas por jornada no se pueden modificar',
      );
    }
    validarFechasComision(cambios.fechaInicio ?? actual.fechaInicio, cambios.fechaFin ?? actual.fechaFin);
    if (cambios.docenteId !== undefined) await this.verificarDocente(cambios.docenteId);
    return this.conDocente(await this.repos.comisiones.actualizar(id, cambios));
  }

  private async verificarDocente(docenteId: number): Promise<void> {
    const docente = await this.repos.usuarios.porId(docenteId);
    if (!docente || docente.rol !== 'DOCENTE') throw new ErrorNegocio(400, 'El docente indicado no existe');
  }

  private async conDocente(comision: Comision): Promise<ComisionVista> {
    const d = await this.repos.usuarios.porId(comision.docenteId);
    return { ...comision, docente: d ? { id: d.id, nombre: d.nombre, apellido: d.apellido } : null };
  }
}
