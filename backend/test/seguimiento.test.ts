import { describe, expect, it } from 'vitest';
import { calcularResumen, calendarioDelMes } from '../src/dominio/seguimiento';
import { DiaNoLaborable, EstadoEntrada } from '../src/dominio/tipos';

// Comisión de lunes a viernes desde el martes 01/09/2026 hasta el viernes 30/10/2026, 4 horas por jornada.
const comision = { id: 1, diasSemana: [1, 2, 3, 4, 5], fechaInicio: '2026-09-01', fechaFin: '2026-10-30', horasJornada: 4 };
const sinFeriados: DiaNoLaborable[] = [];
// Del 01/09 al 14/09 hay 10 días hábiles.
const DIEZ_DIAS = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-14'];
let id = 0;
const entrada = (fecha: string, estado: EstadoEntrada = 'VALIDADA', horas = 4) => ({ id: ++id, fecha, estado, horas });

describe('T21 — RN26: asistencia y riesgo', () => {
  it('con 10 días transcurridos y 7 validados la asistencia es 70 % y está en riesgo', () => {
    const entradas = DIEZ_DIAS.slice(0, 7).map((f) => entrada(f));
    const r = calcularResumen(comision, sinFeriados, entradas, '2026-09-14');
    expect(r.diasTranscurridos).toBe(10);
    expect(r.diasValidados).toBe(7);
    expect(r.asistencia).toBe(70);
    expect(r.enRiesgo).toBe(true);
  });

  it('con 3 días transcurridos y 1 validado la asistencia es 33 % pero no está en riesgo', () => {
    const r = calcularResumen(comision, sinFeriados, [entrada('2026-09-01')], '2026-09-03');
    expect(r.asistencia).toBe(33);
    expect(r.enRiesgo).toBe(false);
  });

  it('con 4 días transcurridos y 2 validados (50 %) ya está en riesgo; con 3 de 4 (75 %) no', () => {
    expect(calcularResumen(comision, sinFeriados, DIEZ_DIAS.slice(0, 2).map((f) => entrada(f)), '2026-09-04').enRiesgo).toBe(true);
    expect(calcularResumen(comision, sinFeriados, DIEZ_DIAS.slice(0, 3).map((f) => entrada(f)), '2026-09-04').enRiesgo).toBe(false);
  });

  it('las entradas enviadas u observadas no suman asistencia', () => {
    const r = calcularResumen(comision, sinFeriados, [entrada('2026-09-01', 'ENVIADA'), entrada('2026-09-02', 'OBSERVADA')], '2026-09-02');
    expect(r.asistencia).toBe(0);
    expect(r.enviadasPorRevisar).toBe(1);
    expect(r.cantidadPorEstado).toEqual({ BORRADOR: 0, ENVIADA: 1, OBSERVADA: 1, VALIDADA: 0 });
  });

  it('si la comisión no empezó: 0 días transcurridos, 100 % de asistencia, sin riesgo ni pendientes', () => {
    const r = calcularResumen(comision, sinFeriados, [], '2026-08-20');
    expect(r).toMatchObject({ diasTranscurridos: 0, asistencia: 100, enRiesgo: false, pendientes: [] });
  });
});

describe('T21 — RN27: horas', () => {
  it('validadas de 3 y 2,5 horas suman 5,5; las horas del calendario son días de práctica × horas por jornada', () => {
    const r = calcularResumen(comision, sinFeriados, [entrada('2026-09-01', 'VALIDADA', 3), entrada('2026-09-02', 'VALIDADA', 2.5), entrada('2026-09-03', 'ENVIADA', 4)], '2026-09-03');
    expect(r.horasValidadas).toBe(5.5);
    expect(r.diasPractica).toBe(44); // septiembre (22) + octubre (22) hábiles desde el 01/09
    expect(r.horasCalendario).toBe(44 * 4);
  });

  it('un feriado futuro descuenta un día de práctica y sus horas (RN8, RN27)', () => {
    const feriado: DiaNoLaborable = { id: 1, fecha: '2026-10-12', motivo: 'Diversidad Cultural', tipo: 'FERIADO', comisionId: null };
    expect(calcularResumen(comision, [feriado], [], '2026-09-03').horasCalendario).toBe(43 * 4);
  });
});

describe('T21 — RN25: pendientes de carga', () => {
  it('lista los días sin entrada dentro del plazo con los días que les quedan, los más urgentes primero', () => {
    const r = calcularResumen(comision, sinFeriados, [entrada('2026-09-08', 'BORRADOR')], '2026-09-10');
    // Del 03/09 en adelante están en plazo (hasta 7 días). El 08 tiene entrada.
    expect(r.pendientes).toEqual([
      { fecha: '2026-09-03', diasRestantes: 0 },
      { fecha: '2026-09-04', diasRestantes: 1 },
      { fecha: '2026-09-07', diasRestantes: 4 },
      { fecha: '2026-09-09', diasRestantes: 6 },
      { fecha: '2026-09-10', diasRestantes: 7 },
    ]);
  });
});

describe('T21 — HU7: estado de cada día del calendario', () => {
  it('distingue día sin práctica, no laborable, futuro, pendiente, sin registro y con entrada', () => {
    const martesJueves = { ...comision, diasSemana: [2, 4] };
    const receso: DiaNoLaborable = { id: 2, fecha: '2026-09-17', motivo: 'Jornada institucional', tipo: 'RECESO', comisionId: 1 };
    const dias = calendarioDelMes(martesJueves, [receso], [entrada('2026-09-08', 'OBSERVADA')], '2026-09', '2026-09-15');
    const de = (f: string) => dias.find((d) => d.fecha === f);
    expect(dias).toHaveLength(30);
    expect(de('2026-09-02')).toEqual({ fecha: '2026-09-02', tipo: 'SIN_PRACTICA' });
    expect(de('2026-09-03')).toEqual({ fecha: '2026-09-03', tipo: 'SIN_REGISTRO' });
    expect(de('2026-09-08')).toMatchObject({ tipo: 'CON_ENTRADA', estado: 'OBSERVADA' });
    expect(de('2026-09-10')).toEqual({ fecha: '2026-09-10', tipo: 'PENDIENTE', diasRestantes: 2 });
    expect(de('2026-09-17')).toEqual({ fecha: '2026-09-17', tipo: 'NO_LABORABLE', motivo: 'Jornada institucional' });
    expect(de('2026-09-22')).toEqual({ fecha: '2026-09-22', tipo: 'FUTURO' });
  });
});
