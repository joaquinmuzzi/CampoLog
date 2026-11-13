import {
  CambiosComision, Comision, DiaNoLaborable, NuevaComision, NuevoUsuario, Rol, Usuario,
} from '../dominio/tipos';

export interface RepoUsuarios {
  /** Lanza EmailDuplicado si el email ya existe (RN2). */
  crear(nuevo: NuevoUsuario): Promise<Usuario>;
  porId(id: number): Promise<Usuario | null>;
  porEmail(email: string): Promise<Usuario | null>;
  listarPorRol(rol: Rol): Promise<Usuario[]>;
  listarEstudiantesDeComision(comisionId: number): Promise<Usuario[]>;
  contarPorRol(rol: Rol): Promise<number>;
  /** Guarda el contador de intentos fallidos y el bloqueo (RN6). */
  actualizarSeguridad(id: number, intentosFallidos: number, bloqueadoHasta: Date | null): Promise<void>;
}

export interface RepoComisiones {
  /** Lanza CodigoDuplicado si el código de inscripción ya existe (RN7). */
  crear(nueva: NuevaComision): Promise<Comision>;
  porId(id: number): Promise<Comision | null>;
  porCodigo(codigo: string): Promise<Comision | null>;
  listar(): Promise<Comision[]>;
  listarPorDocente(docenteId: number): Promise<Comision[]>;
  actualizar(id: number, cambios: CambiosComision): Promise<Comision>;
}

export interface RepoDiasNoLaborables {
  /** Lanza DiaNoLaborableDuplicado si ya hay uno con la misma fecha y alcance (RN9). */
  crear(nuevo: Omit<DiaNoLaborable, 'id'>): Promise<DiaNoLaborable>;
  porId(id: number): Promise<DiaNoLaborable | null>;
  listarFeriados(): Promise<DiaNoLaborable[]>;
  /** Feriados más recesos de esa comisión, ordenados por fecha. */
  paraComision(comisionId: number): Promise<DiaNoLaborable[]>;
  borrar(id: number): Promise<void>;
}

export interface Repos {
  usuarios: RepoUsuarios;
  comisiones: RepoComisiones;
  diasNoLaborables: RepoDiasNoLaborables;
}
