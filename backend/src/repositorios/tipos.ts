import {
  CambiosComision, Comision, NuevaComision, NuevoUsuario, Rol, Usuario,
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

export interface Repos {
  usuarios: RepoUsuarios;
  comisiones: RepoComisiones;
}
