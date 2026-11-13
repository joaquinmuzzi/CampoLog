import { describe, expect, it } from 'vitest';
import { diasDePractica, esDiaDePractica } from '../src/dominio/calendario';
import { DiaNoLaborable } from '../src/dominio/tipos';

// Comisión de martes (2) y jueves (4), del martes 01/09/2026 al jueves 01/10/2026.
const comision = { id: 1, diasSemana: [2, 4], fechaInicio: '2026-09-01', fechaFin: '2026-10-01' };
const feriado: DiaNoLaborable = { id: 1, fecha: '2026-09-10', motivo: 'Feriado de prueba', tipo: 'FERIADO', comisionId: null };
const recesoPropio: DiaNoLaborable = { id: 2, fecha: '2026-09-15', motivo: 'Jornada institucional', tipo: 'RECESO', comisionId: 1 };
const recesoAjeno: DiaNoLaborable = { id: 3, fecha: '2026-09-17', motivo: 'Receso de otra comisión', tipo: 'RECESO', comisionId: 2 };
const noLaborables = [feriado, recesoPropio, recesoAjeno];

describe('T10 — RN8: día de práctica', () => {
  it('el primer y el último día de la comisión cuentan si caen en sus días', () => {
    expect(esDiaDePractica(comision, '2026-09-01', [])).toBe(true);
    expect(esDiaDePractica(comision, '2026-10-01', [])).toBe(true);
  });

  it('fuera del rango de fechas no es día de práctica', () => {
    expect(esDiaDePractica(comision, '2026-08-27', [])).toBe(false); // jueves anterior al inicio
    expect(esDiaDePractica(comision, '2026-10-06', [])).toBe(false); // martes posterior al fin
  });

  it('un día hábil que no es de la comisión o un fin de semana no es día de práctica', () => {
    expect(esDiaDePractica(comision, '2026-09-02', [])).toBe(false); // miércoles
    expect(esDiaDePractica(comision, '2026-09-05', [])).toBe(false); // sábado
  });

  it('un feriado y un receso de la propia comisión no son días de práctica', () => {
    expect(esDiaDePractica(comision, '2026-09-10', noLaborables)).toBe(false);
    expect(esDiaDePractica(comision, '2026-09-15', noLaborables)).toBe(false);
  });

  it('un receso de otra comisión no afecta', () => {
    expect(esDiaDePractica(comision, '2026-09-17', noLaborables)).toBe(true);
  });

  it('lista los días de práctica descontando feriados y recesos, y corta en "hasta"', () => {
    expect(diasDePractica(comision, noLaborables)).toEqual([
      '2026-09-01', '2026-09-03', '2026-09-08', '2026-09-17', '2026-09-22', '2026-09-24', '2026-09-29', '2026-10-01',
    ]);
    expect(diasDePractica(comision, noLaborables, '2026-09-15')).toEqual(['2026-09-01', '2026-09-03', '2026-09-08']);
    expect(diasDePractica(comision, noLaborables, '2026-08-31')).toEqual([]);
  });
});
