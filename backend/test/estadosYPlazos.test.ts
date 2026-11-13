import { describe, expect, it } from 'vitest';
import { puedeBorrar, puedeEditar, puedeTransicionar } from '../src/dominio/estados';
import {
  dentroDePlazoDeCarga, dentroDePlazoDeCorreccion, diasRestantesDeCarga, esFutura,
} from '../src/dominio/plazos';
import { EstadoEntrada } from '../src/dominio/tipos';

const ESTADOS: EstadoEntrada[] = ['BORRADOR', 'ENVIADA', 'OBSERVADA', 'VALIDADA'];
const PERMITIDAS = new Set(['BORRADOR>ENVIADA', 'ENVIADA>VALIDADA', 'ENVIADA>OBSERVADA', 'OBSERVADA>ENVIADA']);

describe('T15 — RN19: transiciones de estado', () => {
  for (const desde of ESTADOS) {
    for (const hacia of ESTADOS) {
      const esperado = PERMITIDAS.has(`${desde}>${hacia}`);
      it(`${desde} → ${hacia}: ${esperado ? 'permitida' : 'rechazada'}`, () => {
        expect(puedeTransicionar(desde, hacia)).toBe(esperado);
      });
    }
  }
});

describe('T15 — RN20: edición y borrado', () => {
  it('se editan solo BORRADOR y OBSERVADA', () => {
    expect(ESTADOS.filter(puedeEditar)).toEqual(['BORRADOR', 'OBSERVADA']);
  });
  it('se borra solo BORRADOR', () => {
    expect(ESTADOS.filter(puedeBorrar)).toEqual(['BORRADOR']);
  });
});

describe('T15 — RN13 y RN14: fechas futuras y plazo de carga', () => {
  const hoy = '2026-09-17';
  it('mañana es futura; hoy no', () => {
    expect(esFutura('2026-09-18', hoy)).toBe(true);
    expect(esFutura(hoy, hoy)).toBe(false);
  });
  it('si la fecha es el jueves 10, el último día para cargarla es el jueves 17', () => {
    expect(dentroDePlazoDeCarga('2026-09-10', '2026-09-17')).toBe(true);
    expect(dentroDePlazoDeCarga('2026-09-10', '2026-09-18')).toBe(false);
  });
  it('hoy está en plazo y una fecha futura no', () => {
    expect(dentroDePlazoDeCarga(hoy, hoy)).toBe(true);
    expect(dentroDePlazoDeCarga('2026-09-18', hoy)).toBe(false);
  });
  it('días restantes: 7 el mismo día, 0 el último día (RN25)', () => {
    expect(diasRestantesDeCarga(hoy, hoy)).toBe(7);
    expect(diasRestantesDeCarga('2026-09-10', hoy)).toBe(0);
  });
});

describe('T15 — RN21: plazo de corrección', () => {
  it('observada el 10: se reenvía hasta el 17 inclusive', () => {
    expect(dentroDePlazoDeCorreccion('2026-09-10', '2026-09-13')).toBe(true);
    expect(dentroDePlazoDeCorreccion('2026-09-10', '2026-09-17')).toBe(true);
    expect(dentroDePlazoDeCorreccion('2026-09-10', '2026-09-18')).toBe(false);
  });
});
