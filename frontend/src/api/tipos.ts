// Tipos de la API (ver docs/plan.md, sección 3). Los nombres siguen docs/glosario.md.

export type Rol = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
export type EstadoEntrada = 'BORRADOR' | 'ENVIADA' | 'OBSERVADA' | 'VALIDADA';
export type TipoEvidencia = 'COMMIT' | 'DOCUMENTO' | 'TAREA' | 'IMAGEN' | 'OTRO';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  comisionId: number | null;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export interface Comision {
  id: number;
  nombre: string;
  diasSemana: number[];
  fechaInicio: string;
  fechaFin: string;
  horasJornada: number;
  codigoInscripcion: string;
  docenteId: number;
  docente?: { id: number; nombre: string; apellido: string } | null;
}

export interface DiaNoLaborable {
  id: number;
  fecha: string;
  motivo: string;
  tipo: 'FERIADO' | 'RECESO';
  comisionId: number | null;
}

export interface Evidencia {
  tipo: TipoEvidencia;
  titulo: string;
  url: string;
}

export interface Comentario {
  id: number;
  autorId: number;
  autorNombre: string;
  tipo: 'OBSERVACION' | 'VALIDACION';
  texto: string;
  creadoEn: string;
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
  enviadaEn: string | null;
  observadaEn: string | null;
  validadaEn: string | null;
}

export interface PaginaDeEntradas {
  items: Entrada[];
  total: number;
  pagina: number;
  paginas: number;
}

export interface Resumen {
  estudiante: Usuario;
  comision: Pick<Comision, 'id' | 'nombre' | 'horasJornada' | 'fechaInicio' | 'fechaFin' | 'diasSemana'>;
  diasPractica: number;
  diasTranscurridos: number;
  diasValidados: number;
  asistencia: number;
  enRiesgo: boolean;
  horasValidadas: number;
  horasCalendario: number;
  pendientes: { fecha: string; diasRestantes: number }[];
  enviadasPorRevisar: number;
  cantidadPorEstado: Record<EstadoEntrada, number>;
}

export type TipoDia = 'SIN_PRACTICA' | 'NO_LABORABLE' | 'FUTURO' | 'PENDIENTE' | 'SIN_REGISTRO' | 'CON_ENTRADA';

export interface DiaDelCalendario {
  fecha: string;
  tipo: TipoDia;
  motivo?: string;
  diasRestantes?: number;
  entradaId?: number;
  estado?: EstadoEntrada;
}

export interface Calendario {
  mes: string;
  hoy: string;
  dias: DiaDelCalendario[];
}

export interface DatosEntrada {
  actividad: string;
  descripcion: string;
  horas: number;
  etiquetas: string[];
  evidencias: Evidencia[];
}
