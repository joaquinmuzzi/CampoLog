import { diaDeSemana, sumarDias } from './fechas';
import { Comision, DiaNoLaborable } from './tipos';

export type CalendarioComision = Pick<Comision, 'id' | 'diasSemana' | 'fechaInicio' | 'fechaFin'>;

/** Día no laborable que afecta a la comisión en esa fecha: un feriado o un receso de esa misma comisión (RN9). */
export function noLaborableDe(
  comision: CalendarioComision, fecha: string, noLaborables: DiaNoLaborable[],
): DiaNoLaborable | undefined {
  return noLaborables.find(
    (d) => d.fecha === fecha && (d.tipo === 'FERIADO' || d.comisionId === comision.id),
  );
}

/** RN8: entre inicio y fin (incluidos), en un día de la semana de la comisión y que no sea no laborable. */
export function esDiaDePractica(comision: CalendarioComision, fecha: string, noLaborables: DiaNoLaborable[]): boolean {
  if (fecha < comision.fechaInicio || fecha > comision.fechaFin) return false;
  if (!comision.diasSemana.includes(diaDeSemana(fecha))) return false;
  return noLaborableDe(comision, fecha, noLaborables) === undefined;
}

/** Todos los días de práctica de la comisión, en orden, opcionalmente hasta una fecha (incluida). */
export function diasDePractica(
  comision: CalendarioComision, noLaborables: DiaNoLaborable[], hasta?: string,
): string[] {
  const fin = hasta && hasta < comision.fechaFin ? hasta : comision.fechaFin;
  const dias: string[] = [];
  for (let fecha = comision.fechaInicio; fecha <= fin; fecha = sumarDias(fecha, 1)) {
    if (esDiaDePractica(comision, fecha, noLaborables)) dias.push(fecha);
  }
  return dias;
}
