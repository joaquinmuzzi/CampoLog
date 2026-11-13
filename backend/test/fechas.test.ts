import { describe, expect, it } from 'vitest';
import {
  diaDeSemana, diasDelMes, diferenciaEnDias, esFechaValida, esMesValido, mesDe, sumarDias,
} from '../src/dominio/fechas';
import { RelojArgentina, RelojFijo } from '../src/reloj';

describe('T02 — utilidades de fechas', () => {
  it('valida fechas AAAA-MM-DD reales', () => {
    expect(esFechaValida('2026-09-15')).toBe(true);
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('15/09/2026')).toBe(false);
    expect(esFechaValida('2026-9-5')).toBe(false);
  });

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-08-28', 7)).toBe('2026-09-04');
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('calcula la diferencia en días entre dos fechas', () => {
    expect(diferenciaEnDias('2026-09-10', '2026-09-17')).toBe(7);
    expect(diferenciaEnDias('2026-09-17', '2026-09-10')).toBe(-7);
  });

  it('devuelve el día de la semana con 1 = lunes y 7 = domingo', () => {
    expect(diaDeSemana('2026-11-09')).toBe(1); // lunes
    expect(diaDeSemana('2026-11-13')).toBe(5); // viernes
    expect(diaDeSemana('2026-11-15')).toBe(7); // domingo
  });

  it('obtiene el mes y lista sus días', () => {
    expect(mesDe('2026-09-15')).toBe('2026-09');
    expect(esMesValido('2026-13')).toBe(false);
    const dias = diasDelMes('2026-02');
    expect(dias).toHaveLength(28);
    expect(dias[0]).toBe('2026-02-01');
    expect(dias[27]).toBe('2026-02-28');
  });
});

describe('T02 — reloj', () => {
  it('a las 23:30 de Argentina (02:30 UTC del día siguiente) hoy sigue siendo el día de Argentina', () => {
    const reloj = new RelojArgentina(() => new Date('2026-09-16T02:30:00Z'));
    expect(reloj.hoy()).toBe('2026-09-15');
  });

  it('el reloj fijo devuelve la fecha indicada y se puede adelantar', () => {
    const reloj = new RelojFijo('2026-09-15T12:00:00-03:00');
    expect(reloj.hoy()).toBe('2026-09-15');
    reloj.avanzarMinutos(15 * 60);
    expect(reloj.hoy()).toBe('2026-09-16');
  });
});
