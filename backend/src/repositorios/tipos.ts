import {
  CambiosComision, Comision, DatosEntrada, DiaNoLaborable, Entrada, EstadoEntrada, NuevaComision, NuevoUsuario, Rol,
  TipoComentario, Usuario,
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

export interface NuevaEntrada {
  estudianteId: number;
  comisionId: number;
  fecha: string;
  datos: DatosEntrada;
}

/** Cambios que se aplican a una entrada en una sola operación con control de versión (RN23). */
export interface CambiosEntrada {
  datos?: DatosEntrada;
  estado?: EstadoEntrada;
  enviadaEn?: Date;
  observadaEn?: Date;
  validadaEn?: Date;
  comentario?: { autorId: number; tipo: TipoComentario; texto: string };
}

export interface FiltroEntradas {
  estudianteId: number;
  /** AAAA-MM */
  mes?: string;
  estado?: EstadoEntrada;
  /** Empieza en 1. */
  pagina: number;
}

export const ENTRADAS_POR_PAGINA = 10; // RN29

export interface RepoEntradas {
  /** Lanza EntradaDuplicada si el estudiante ya tiene una entrada en esa fecha (RN15). */
  crear(nueva: NuevaEntrada): Promise<Entrada>;
  porId(id: number): Promise<Entrada | null>;
  /** RN29: 10 por página, por fecha descendente. */
  listar(filtro: FiltroEntradas): Promise<{ items: Entrada[]; total: number }>;
  todasDeEstudiante(estudianteId: number): Promise<Entrada[]>;
  /** Lanza VersionDesactualizada si la versión leída no es la actual (RN23). Suma 1 a la versión. */
  actualizarConVersion(id: number, versionLeida: number, cambios: CambiosEntrada): Promise<Entrada>;
  /** Lanza VersionDesactualizada si la versión leída no es la actual (RN23). */
  borrarConVersion(id: number, versionLeida: number): Promise<void>;
}

export interface Repos {
  usuarios: RepoUsuarios;
  comisiones: RepoComisiones;
  diasNoLaborables: RepoDiasNoLaborables;
  entradas: RepoEntradas;
}
