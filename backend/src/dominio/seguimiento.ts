import { CalendarioComision, diasDePractica, esDiaDePractica, noLaborableDe } from './calendario';
import { diasDelMes } from './fechas';
import { dentroDePlazoDeCarga, diasRestantesDeCarga, esFutura } from './plazos';
import { Comision, DiaNoLaborable, Entrada, EstadoEntrada } from './tipos';

export const ASISTENCIA_MINIMA = 75; // RN26
export const DIAS_MINIMOS_PARA_RIESGO = 4; // RN26

type EntradaResumida = Pick<Entrada, 'id' | 'fecha' | 'estado' | 'horas'>;
type ComisionSeguimiento = CalendarioComision & Pick<Comision, 'horasJornada'>;

export interface Pendiente {
  fecha: string;
  diasRestantes: number;
}

export interface Resumen {
  diasPractica: number;
  diasTranscurridos: number;
  diasValidados: number;
  asistencia: number;
  enRiesgo: boolean;
  horasValidadas: number;
  horasCalendario: number;
  pendientes: Pendiente[];
  enviadasPorRevisar: number;
  cantidadPorEstado: Record<EstadoEntrada, number>;
}

/** RN25, RN26, RN27 — Resumen de seguimiento de un estudiante. */
export function calcularResumen(
  comision: ComisionSeguimiento, noLaborables: DiaNoLaborable[], entradas: EntradaResumida[], hoy: string,
): Resumen {
  const todos = diasDePractica(comision, noLaborables);
  const transcurridos = todos.filter((d) => d <= hoy);
  const porFecha = new Map(entradas.map((e) => [e.fecha, e]));
  const validadas = entradas.filter((e) => e.estado === 'VALIDADA');
  const diasValidados = transcurridos.filter((d) => porFecha.get(d)?.estado === 'VALIDADA').length;

  // RN26: si no transcurrió ningún día, la asistencia es 100.
  const asistencia = transcurridos.length === 0 ? 100 : Math.round((diasValidados / transcurridos.length) * 100);

  const cantidadPorEstado: Record<EstadoEntrada, number> = { BORRADOR: 0, ENVIADA: 0, OBSERVADA: 0, VALIDADA: 0 };
  for (const e of entradas) cantidadPorEstado[e.estado]++;

  return {
    diasPractica: todos.length,
    diasTranscurridos: transcurridos.length,
    diasValidados,
    asistencia,
    enRiesgo: asistencia < ASISTENCIA_MINIMA && transcurridos.length >= DIAS_MINIMOS_PARA_RIESGO,
    horasValidadas: Math.round(validadas.reduce((suma, e) => suma + e.horas, 0) * 10) / 10, // RN27
    horasCalendario: todos.length * comision.horasJornada, // RN27
    // RN25: días transcurridos sin entrada y todavía en plazo, primero los que vencen antes.
    pendientes: transcurridos
      .filter((d) => !porFecha.has(d) && dentroDePlazoDeCarga(d, hoy))
      .map((fecha) => ({ fecha, diasRestantes: diasRestantesDeCarga(fecha, hoy) })),
    enviadasPorRevisar: cantidadPorEstado.ENVIADA,
    cantidadPorEstado,
  };
}

export type TipoDia =
  | 'SIN_PRACTICA' | 'NO_LABORABLE' | 'FUTURO' | 'PENDIENTE' | 'SIN_REGISTRO' | 'CON_ENTRADA';

export interface DiaDelCalendario {
  fecha: string;
  tipo: TipoDia;
  motivo?: string;
  diasRestantes?: number;
  entradaId?: number;
  estado?: EstadoEntrada;
}

/** HU7 — Estado de cada día del mes para el calendario del estudiante (RN8, RN14, RN25). */
export function calendarioDelMes(
  comision: CalendarioComision, noLaborables: DiaNoLaborable[], entradas: EntradaResumida[], mes: string, hoy: string,
): DiaDelCalendario[] {
  const porFecha = new Map(entradas.map((e) => [e.fecha, e]));
  return diasDelMes(mes).map((fecha): DiaDelCalendario => {
    const entrada = porFecha.get(fecha);
    if (entrada) return { fecha, tipo: 'CON_ENTRADA', entradaId: entrada.id, estado: entrada.estado };
    if (!esDiaDePractica(comision, fecha, noLaborables)) {
      const noLaborable = fecha >= comision.fechaInicio && fecha <= comision.fechaFin
        ? noLaborableDe(comision, fecha, noLaborables) : undefined;
      return noLaborable ? { fecha, tipo: 'NO_LABORABLE', motivo: noLaborable.motivo } : { fecha, tipo: 'SIN_PRACTICA' };
    }
    if (esFutura(fecha, hoy)) return { fecha, tipo: 'FUTURO' };
    if (dentroDePlazoDeCarga(fecha, hoy)) return { fecha, tipo: 'PENDIENTE', diasRestantes: diasRestantesDeCarga(fecha, hoy) };
    return { fecha, tipo: 'SIN_REGISTRO' };
  });
}
