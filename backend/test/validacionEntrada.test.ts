import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { validarDatosEntrada } from '../src/dominio/entrada';

const valida = {
  actividad: 'Terminamos el DER',
  descripcion: 'Revisamos claves foráneas',
  horas: 4,
  etiquetas: ['base de datos'],
  evidencias: [{ tipo: 'DOCUMENTO', titulo: 'DER en Drive', url: 'https://drive.google.com/x' }],
};

function error(cuerpo: object, horasJornada = 4): string {
  try {
    validarDatosEntrada(cuerpo, horasJornada);
  } catch (e) {
    if (e instanceof ZodError) return e.issues[0].message;
    throw e;
  }
  return 'sin error';
}

describe('T14 — RN16: horas', () => {
  it('acepta 0,5 y exactamente las horas por jornada', () => {
    expect(validarDatosEntrada({ ...valida, horas: 0.5 }, 4).horas).toBe(0.5);
    expect(validarDatosEntrada({ ...valida, horas: 4 }, 4).horas).toBe(4);
  });
  it('rechaza 0, más que la jornada y lo que no es múltiplo de 0,5', () => {
    expect(error({ ...valida, horas: 0 })).toBe('Las horas tienen que estar entre 0,5 y 4');
    expect(error({ ...valida, horas: 4.5 })).toContain('horas por jornada de la comisión');
    expect(error({ ...valida, horas: 2.3 })).toBe('Las horas se cargan en múltiplos de media hora (0,5)');
  });
});

describe('T14 — RN17: textos', () => {
  it('acepta actividad de 5 y de 120 caracteres y recorta espacios', () => {
    expect(validarDatosEntrada({ ...valida, actividad: '  Abcde  ' }, 4).actividad).toBe('Abcde');
    expect(validarDatosEntrada({ ...valida, actividad: 'a'.repeat(120) }, 4).actividad).toHaveLength(120);
  });
  it('rechaza actividad de 4 y de 121 caracteres', () => {
    expect(error({ ...valida, actividad: 'Abcd' })).toBe('La actividad tiene que tener entre 5 y 120 caracteres');
    expect(error({ ...valida, actividad: 'a'.repeat(121) })).toBe('La actividad tiene que tener entre 5 y 120 caracteres');
  });
  it('descripción opcional hasta 2000 caracteres', () => {
    expect(validarDatosEntrada({ ...valida, descripcion: undefined }, 4).descripcion).toBe('');
    expect(error({ ...valida, descripcion: 'x'.repeat(2001) })).toBe('La descripción puede tener hasta 2000 caracteres');
  });
  it('hasta 5 etiquetas de hasta 30 caracteres, sin repetir', () => {
    expect(validarDatosEntrada({ ...valida, etiquetas: ['a', 'b', 'c', 'd', 'e'] }, 4).etiquetas).toHaveLength(5);
    expect(error({ ...valida, etiquetas: ['a', 'b', 'c', 'd', 'e', 'f'] })).toBe('Podés cargar hasta 5 etiquetas');
    expect(error({ ...valida, etiquetas: ['x'.repeat(31)] })).toBe('Cada etiqueta puede tener hasta 30 caracteres');
    expect(error({ ...valida, etiquetas: ['Código', 'código'] })).toBe('Las etiquetas no se pueden repetir');
  });
});

describe('T14 — RN18: evidencias', () => {
  const ev = valida.evidencias[0];
  it('acepta hasta 5 evidencias http o https', () => {
    expect(validarDatosEntrada({ ...valida, evidencias: Array(5).fill(ev) }, 4).evidencias).toHaveLength(5);
    expect(validarDatosEntrada({ ...valida, evidencias: [{ ...ev, url: 'http://github.com/a' }] }, 4).evidencias[0].url).toBe('http://github.com/a');
  });
  it('rechaza 6 evidencias', () => {
    expect(error({ ...valida, evidencias: Array(6).fill(ev) })).toBe('Podés cargar hasta 5 evidencias por entrada');
  });
  it('rechaza una URL "ftp://x" o sin dominio', () => {
    expect(error({ ...valida, evidencias: [{ ...ev, url: 'ftp://x' }] })).toBe('El link de la evidencia tiene que empezar con http:// o https://');
    expect(error({ ...valida, evidencias: [{ ...ev, url: 'https://' }] })).toBe('El link de la evidencia tiene que empezar con http:// o https://');
  });
  it('rechaza tipo desconocido, título corto y URL de más de 500 caracteres', () => {
    expect(error({ ...valida, evidencias: [{ ...ev, tipo: 'VIDEO' }] })).toContain('El tipo de evidencia');
    expect(error({ ...valida, evidencias: [{ ...ev, titulo: 'ab' }] })).toBe('El título de la evidencia tiene que tener entre 3 y 80 caracteres');
    expect(error({ ...valida, evidencias: [{ ...ev, url: `https://x.com/${'a'.repeat(490)}` }] })).toBe('El link de la evidencia puede tener hasta 500 caracteres');
  });
});
