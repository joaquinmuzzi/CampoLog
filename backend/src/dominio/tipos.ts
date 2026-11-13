// Tipos del dominio. Los nombres siguen docs/glosario.md.

export type Rol = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  passwordHash: string;
  rol: Rol;
  comisionId: number | null;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
  creadoEn: Date;
}

export type NuevoUsuario = Pick<Usuario, 'nombre' | 'apellido' | 'email' | 'passwordHash' | 'rol' | 'comisionId'>;

/** Lo que se puede mostrar de un usuario (nunca el hash ni los datos de seguridad). */
export interface UsuarioPublico {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  comisionId: number | null;
}

export function aPublico(u: Usuario): UsuarioPublico {
  return { id: u.id, nombre: u.nombre, apellido: u.apellido, email: u.email, rol: u.rol, comisionId: u.comisionId };
}

export interface Comision {
  id: number;
  nombre: string;
  /** 1 = lunes ... 5 = viernes (RN7). */
  diasSemana: number[];
  fechaInicio: string;
  fechaFin: string;
  horasJornada: number;
  codigoInscripcion: string;
  docenteId: number;
  creadoEn: Date;
}

export type NuevaComision = Omit<Comision, 'id' | 'creadoEn'>;
export type CambiosComision = Partial<
  Pick<Comision, 'nombre' | 'diasSemana' | 'fechaInicio' | 'fechaFin' | 'horasJornada' | 'docenteId'>
>;

export type TipoDiaNoLaborable = 'FERIADO' | 'RECESO';

export interface DiaNoLaborable {
  id: number;
  fecha: string;
  motivo: string;
  tipo: TipoDiaNoLaborable;
  /** null para un feriado (vale para todas las comisiones). */
  comisionId: number | null;
}

export type EstadoEntrada = 'BORRADOR' | 'ENVIADA' | 'OBSERVADA' | 'VALIDADA';
export type TipoEvidencia = 'COMMIT' | 'DOCUMENTO' | 'TAREA' | 'IMAGEN' | 'OTRO';
export type TipoComentario = 'OBSERVACION' | 'VALIDACION';

export interface Evidencia {
  tipo: TipoEvidencia;
  titulo: string;
  url: string;
}

export interface Comentario {
  id: number;
  autorId: number;
  autorNombre: string;
  tipo: TipoComentario;
  texto: string;
  creadoEn: Date;
}

export interface Entrada {
  id: number;
  estudianteId: number;
  comisionId: number;
  fecha: string;
  actividad: string;
  descripcion: string;
  horas: number;
  etiquetas: string[];
  estado: EstadoEntrada;
  version: number;
  evidencias: Evidencia[];
  comentarios: Comentario[];
  enviadaEn: Date | null;
  observadaEn: Date | null;
  validadaEn: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Los datos que el estudiante carga en una entrada. */
export interface DatosEntrada {
  actividad: string;
  descripcion: string;
  horas: number;
  etiquetas: string[];
  evidencias: Evidencia[];
}
