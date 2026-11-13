import { Comision, Entrada, Usuario } from '../dominio/tipos';
import { ErrorNegocio, noEncontrado } from '../errores';
import { Repos } from '../repositorios/tipos';
import { DatosToken } from './authServicio';

/**
 * RN24 — Privacidad. El estudiante ve solo lo suyo, el docente solo lo de sus comisiones y el administrador todo.
 * Lo ajeno responde 404 para no revelar que existe.
 */
export class AccesoServicio {
  constructor(private readonly repos: Repos) {}

  async entradaVisible(usuario: DatosToken, id: number): Promise<Entrada> {
    const entrada = await this.repos.entradas.porId(id);
    if (!entrada || !(await this.puedeVerDeComision(usuario, entrada.estudianteId, entrada.comisionId))) {
      throw noEncontrado('Entrada');
    }
    return entrada;
  }

  /** Entrada del propio estudiante (para editar, borrar o enviar). */
  async entradaPropia(usuario: DatosToken, id: number): Promise<Entrada> {
    const entrada = await this.repos.entradas.porId(id);
    if (!entrada || entrada.estudianteId !== usuario.id) throw noEncontrado('Entrada');
    return entrada;
  }

  /** Estudiante visible para un docente (de sus comisiones) o para el administrador. */
  async estudianteVisible(usuario: DatosToken, estudianteId: number): Promise<{ estudiante: Usuario; comision: Comision }> {
    const estudiante = await this.repos.usuarios.porId(estudianteId);
    if (!estudiante || estudiante.rol !== 'ESTUDIANTE' || !estudiante.comisionId) throw noEncontrado('Estudiante');
    if (!(await this.puedeVerDeComision(usuario, estudiante.id, estudiante.comisionId))) throw noEncontrado('Estudiante');
    const comision = await this.repos.comisiones.porId(estudiante.comisionId);
    if (!comision) throw noEncontrado('Comisión');
    return { estudiante, comision };
  }

  private async puedeVerDeComision(usuario: DatosToken, estudianteId: number, comisionId: number): Promise<boolean> {
    if (usuario.rol === 'ADMIN') return true;
    if (usuario.rol === 'ESTUDIANTE') return usuario.id === estudianteId;
    const comision = await this.repos.comisiones.porId(comisionId);
    return comision?.docenteId === usuario.id;
  }
}

/** RN23 — Conflicto de versión: informa la versión y el estado actuales. */
export function conflictoDeVersion(actual: Pick<Entrada, 'version' | 'estado'>): ErrorNegocio {
  return new ErrorNegocio(
    409,
    'Otra persona modificó esta entrada mientras la tenías abierta. Revisá su estado actual antes de seguir.',
    { version: actual.version, estado: actual.estado },
  );
}
